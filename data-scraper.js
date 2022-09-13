const http = require('http');
const url = require('url');
const axios = require('axios');
const cheerio = require('cheerio');
const series = require('to-series');

const PORT = 9876;
const YEAR = new Date().getFullYear();
const BATTING_LEADERS_URL = `https://www.baseball-reference.com/leagues/majors/${YEAR}-batting-leaders.shtml`;
const BATTER_VS_PITCHER_URL = `https://swishanalytics.com/optimus/mlb/batter-vs-pitcher-stats`;
const LINEUPS_URL = `https://swishanalytics.com/optimus/mlb/lineups`;
const resHeaders = {
	"Access-Control-Allow-Origin": "*"
}
let pageCache = {};

const server = http.createServer((req, res) => {
	let query;

	try {
		query = url.parse(req.url, true).query;
	} catch(err) {
		console.error('URL parse error', err);
		res.writeHead(500, resHeaders);
		return res.end();
	}
	resHeaders['Content-Type'] = 'application/json';

	if (query.q === 'top') {
		return getTopBatters(res);
	} else if (query.q === 'lineups') {
		return getLineups(res);
	} else if (query.q === 'batterVsPitcher') {
		return compileBatterDetails(res);
	} else if (query.q === 'pitcher') {
		return compilePitcherDetails(query, res);
	} else if (query.q === 'more') {
		return getMoreStats(query, res);
	} else {
		resHeaders['Content-Type'] = 'application/json';
		res.writeHead(200, resHeaders);
		res.write(JSON.stringify({ query: query }));
		return res.end();
	}
});

const getMoreStats = (query, res) => {
	const { n: name, t: team } = query;
	let status = 200,
		output = {},
		wasCached = false,
		BRKey; // BRKey is Baseball Reference Key
	if (!name || !team) {
		status = 400;
		output = { error: 'Name or team of batter not found.' };
		res.writeHead(status, resHeaders);
		res.write(JSON.stringify(output));
		return res.end();
	}

	series()
		.first(cb => {
			getTeamBRKeys(name, team, (err, data) => {
				if (err) return cb(err);
				BRKey = data.key;
				wasCached = data.cached;
				return cb();
			});
		})
		.next(cb => {
			if (wasCached) {
				return cb();
			}
			setTimeout(() => {
				// Just waiting a bit before next request so we're not hammering the site
				return cb();
			}, 3000);
		})
		.next(cb => {
			if (!BRKey) {
				return cb(new Error('Baseball Reference Key not found.'));
			}
			const GAMELOG_URL = `https://www.baseball-reference.com/players/gl.fcgi?id=${BRKey}&t=b&year=${YEAR}`;
			const pageCacheKey = 'gamelog-' + name;
			let gamelog = getPageCache(pageCacheKey);

			if (gamelog) {
				console.log('getting cached gamelog for ' + name);
				output = gamelog;
				return cb();
			}
			axios(GAMELOG_URL)
				.then(response => {
					gamelog = extractBattersGameLog(cheerio.load(response.data));
					if (!gamelog) {
						return cb(new Error(`Unable to get gamelog for ${name}.`));
					}
					setPageCache(pageCacheKey, gamelog);
					output = gamelog;
					return cb();
				})
				.catch(cb);
		})
		.end(err => {
			if (err) {
				console.log('err', err);
				status = 500;
				output = { error: err.message || err };
			}

			res.writeHead(status, resHeaders);
			res.write(JSON.stringify(output));
			return res.end();
		})
}

const extractPitchersGameLog = ($) => {
	const output = {
		IP: 0,
		H: 0,
		BB: 0,
		SO: 0,
		'Batters Faced': 0, // Batters faced
		'Ground Balls': 0, // Ground balls
		'Fly Balls': 0, // Fly balls
		'Line Drives': 0, // Line drives
		'Pop Ups': 0, // Pop ups
		'Pitches/G': 0, // Pitches
		'Strikes/G': 0 // Strikes
	};
	const gamelogWrapper = $('#pitching_gamelogs');
	const gamelogDaysElements = gamelogWrapper.find('tbody > tr[id^=pitching_gamelogs]');
	const gamelogDays = gamelogDaysElements.length;
	let pitches = 0,
		strikes = 0,
		games = 0;
	for (let i = gamelogDays-1; i > gamelogDays-7; i--) {
		games++;
		output.IP += Number($(gamelogDaysElements[i]).find('td[data-stat="IP"]').text().trim());
		output.H += Number($(gamelogDaysElements[i]).find('td[data-stat="H"]').text().trim());
		output.BB += Number($(gamelogDaysElements[i]).find('td[data-stat="BB"]').text().trim());
		output.SO += Number($(gamelogDaysElements[i]).find('td[data-stat="SO"]').text().trim());
		output['Batters Faced'] += Number($(gamelogDaysElements[i]).find('td[data-stat="batters_faced"]').text().trim());
		output['Ground Balls'] += Number($(gamelogDaysElements[i]).find('td[data-stat="inplay_gb_total"]').text().trim());
		output['Fly Balls'] += Number($(gamelogDaysElements[i]).find('td[data-stat="inplay_fb_total"]').text().trim());
		output['Line Drives'] += Number($(gamelogDaysElements[i]).find('td[data-stat="inplay_ld"]').text().trim());
		output['Pop Ups'] += Number($(gamelogDaysElements[i]).find('td[data-stat="inplay_pu"]').text().trim());
		pitches += Number($(gamelogDaysElements[i]).find('td[data-stat="pitches"]').text().trim());
		strikes += Number($(gamelogDaysElements[i]).find('td[data-stat="strikes_total"]').text().trim());
	}
	output['Pitches/G'] = Number(pitches / games).toFixed(2);
	output['Strikes/G'] = Number(strikes / games).toFixed(2);
	return output;
}

const extractBattersGameLog = ($) => {
	const output = {
		'Current Streak': 0,
		'Longest Streak': 0,
		H: 0,
		PA: 0,
		AB: 0,
		BB: 0,
		SO: 0,
		AVG: 0
	};
	const gamelogWrapper = $('#batting_gamelogs');
	const gamelogDaysElements = gamelogWrapper.find('tbody > tr[id^=batting_gamelogs]');
	const gamelogDays = gamelogDaysElements.length;
	let streakCounter = 0,
		currentStreak = 0,
		hit;
	for (let i = gamelogDays-1; i > gamelogDays-32; i--) {
		hit = Number($(gamelogDaysElements[i]).find('td[data-stat="H"]').text().trim());
		output.H += hit;
		output.PA += Number($(gamelogDaysElements[i]).find('td[data-stat="PA"]').text().trim());
		output.AB += Number($(gamelogDaysElements[i]).find('td[data-stat="AB"]').text().trim());
		output.BB += Number($(gamelogDaysElements[i]).find('td[data-stat="BB"]').text().trim());
		output.SO += Number($(gamelogDaysElements[i]).find('td[data-stat="SO"]').text().trim());
		if (hit) {
			streakCounter++;
			if (i === gamelogDays-1 || currentStreak) {
				// If player had a hit in latest game, then current streak starts
				currentStreak++;
			}
		} else {
			if (streakCounter > output['Longest Streak']) {
				output['Longest Streak'] = streakCounter;
			}
			if (currentStreak) {
				output['Current Streak'] = currentStreak;
				currentStreak = 0;
			}
			streakCounter = 0;
		}
	}
	output.AVG = Number(output.H / output.AB).toFixed(3);
	return output;
}

const getBRKey = (name, team) => {
	/*
		The BR names have accented letters on them: Tomás Nido
		The names we extract from swish-analytics don't have accented letters: Tomas Nido
		
		Names can be matched up most of the time but when they don't we need the BR key to find them.

		The keys don't exactly follow a pattern but most of the time, it's follows this:
		first 5 of last name (or as many as there are if less than 5) and first 2 of first name

		Example:
		Joey Votto - vottojo01
		Chris Okey - okeych01
		Tommy Pham - phamth01 <-- rare cases
	 */
	const pageCacheKey = 'team-' + team;
	const battersBRKeys = getPageCache(pageCacheKey);
	let BRKey, tempKey, nameSplit, firstName, lastName;

	// Find by name, works on non-accented names
	if (battersBRKeys) {
		BRKey = battersBRKeys[name];
	} else {
		return null;
	}

	// If still not found, we need to search by attempting to construct the BR key ourselves
	if (!BRKey) {
		nameSplit = name.split(' ');
		firstName = nameSplit.shift().replace(/[\.\s-,']/g, ''); // Should always be the first element
		lastName = nameSplit.join(' ').replace(/[\.\s-,']/g, ''); // Should always be the rest of the elements
		tempKey = lastName.substring(0, 5) + firstName.substring(0, 2);
		tempKey = tempKey.toLowerCase();
		console.log('tempKey', tempKey);
		for (let batterName in battersBRKeys) {
			if (battersBRKeys[batterName] && battersBRKeys[batterName].startsWith(tempKey)) {
				BRKey = battersBRKeys[batterName];
			}
		}
	}

	return BRKey;
}

const getTeamBRKeys = (name, team, done) => {
	const TEAM_URL = `https://www.baseball-reference.com/teams/${team}/${YEAR}.shtml`;
	const pageCacheKey = 'team-' + team;
	const output = {};
	let BRKey = getBRKey(name, team);

	if (BRKey) {
		console.log('getting cached BR key');
		output.key = BRKey;
		output.cached = true;
		return done(null, output);
	}
	axios(TEAM_URL)
		.then(response => {
			const BRKeys = extractBRKeys(cheerio.load(response.data));
			if (Object.keys(BRKeys).length === 0) {
				return done(new Error('Unable to get Baseball Reference keys for team.'));
			}
			setPageCache(pageCacheKey, BRKeys);
			BRKey = getBRKey(name, team);
			output.key = BRKey;
			output.cached = false;
			return done(null, output);
		})
		.catch(done);
}

const extractBRKeys = ($) => {
	const keys = {};
	let name, key, wrapper;

	['#team_batting', '#team_pitching'].forEach(tableKey => {
		wrapper = $(tableKey);
		// Only get active players
		// This doesn't always work because BR doesn't take them off the inactive status until they actually play the game
		// For example, Max Fried is pitching today but he is coming off the IL today but not officially until the game starts
		wrapper.find('tbody > tr:not(.thead) td[data-stat="player"] > strong').each((i, element) => {
			if (i > 15) return false; // This will break out of each loop
			name = $(element).find('a').text().trim();
			key = $(element).parent().data('append-csv');
			keys[name] = key;
		});
	});

	return keys;
}

const getLineups = (res) => {
	let status = 200,
		lineups = {};

	series()
		.first(cb => {
			loadLineups((err, data) => {
				if (err) return cb(err);
				lineups = data;
				return cb();
			});
		})
		.end(err => {
			if (err) {
				console.error('Error', err);
				status = 400;
				lineups = { error: err };
			}

			res.writeHead(status, resHeaders);
			res.write(JSON.stringify(lineups));
			return res.end();
		})
}

const loadLineups = (done) => {
	const pageCacheKey = 'lineups';
	const currentPageCache = getPageCache(pageCacheKey);

	if (currentPageCache) {
		console.log('getting cached lineups');
		return done(null, currentPageCache);
	}
	axios(LINEUPS_URL)
		.then(response => {
			const lineups = extractLineups(cheerio.load(response.data));
			if (!lineups) {
				return done(new Error('Unable to get lineups.'));
			}
			setPageCache(pageCacheKey, lineups);
			return done(null, lineups);
		})
		.catch(done);
}

const extractLineups = ($) => {
	const lineUps = {};
	const lineUpsWrapper = $('.non-fantasy-data');
	let leftTeam, rightTeam, leftTable, rightTable;

	lineUpsWrapper.find('a[href*="/mlb/game"]').each((i, element) => {
		leftTable = $(element).find('.table.text-left');
		rightTable = $(element).find('.table.text-right');
		leftTeam = $(element).find('.logo-account-title:nth-of-type(1)').attr('src').match(/\/team-logos\/(.+)\.png/)[1];
		rightTeam = $(element).find('.logo-account-title:nth-of-type(2)').attr('src').match(/\/team-logos\/(.+)\.png/)[1];
		lineUps[leftTeam] = [];
		lineUps[rightTeam] = [];

		leftTable.find('#lineup-table-top').each((j, rowElement) => {
			let [matched, batter, bats] = $(rowElement).text().match(/\d\s+(.+)\s+\((.+)\)/);
			lineUps[leftTeam].push({
				name: batter.trim(),
				bats: bats.trim()
			});
		});

		rightTable.find('#lineup-table-top').each((j, rowElement) => {
			let [matched, bats, batter] = $(rowElement).text().match(/.+\((.+)\)\s+(.+)\s.b class.+>\d/);
			lineUps[rightTeam].push({
				name: batter.trim(),
				bats: bats.trim()
			});
		});
	});

	return lineUps;
}

const compileBatterDetails = (res) => {
	let status = 200,
		output = {};

	getBattingVsPitcher((err, data) => {
		if (err) {
			console.error('Error', err);
			status = 400;
			output = { error: err };
		} else {
			output = data;
		}

		res.writeHead(status, resHeaders);
		res.write(JSON.stringify(output));
		return res.end();
	});
}

const compilePitcherDetails = (query, res) => {
	const { n: name, t: team } = query;
	let status = 200,
		output = {},
		wasCached = false,
		BRKey; // BRKey is Baseball Reference Key
	if (!name || !team) {
		status = 400;
		output = { error: 'Name or team of pitcher not found.' };
		res.writeHead(status, resHeaders);
		res.write(JSON.stringify(output));
		return res.end();
	}

	series()
		.first(cb => {
			getTeamBRKeys(name, team, (err, data) => {
				if (err) return cb(err);
				BRKey = data.key;
				wasCached = data.cached;
				return cb();
			});
		})
		.next(cb => {
			if (wasCached) {
				return cb();
			}
			setTimeout(() => {
				// Just waiting a bit before next request so we're not hammering the site
				return cb();
			}, 3000);
		})
		.next(cb => {
			if (!BRKey) {
				return cb(new Error('Baseball Reference Key not found.'));
			}
			const GAMELOG_URL = `https://www.baseball-reference.com/players/gl.fcgi?id=${BRKey}&t=p&year=${YEAR}`;
			const pageCacheKey = 'gamelog-' + name;
			let gamelog = getPageCache(pageCacheKey);

			if (gamelog) {
				console.log('getting cached gamelog for ' + name);
				output = gamelog;
				return cb();
			}
			axios(GAMELOG_URL)
				.then(response => {
					gamelog = extractPitchersGameLog(cheerio.load(response.data));
					if (!gamelog) {
						return cb(new Error(`Unable to get gamelog for ${name}.`));
					}
					setPageCache(pageCacheKey, gamelog);
					output = gamelog;
					return cb();
				})
				.catch(cb);
		})
		.end(err => {
			if (err) {
				console.log('err', err);
				status = 500;
				output = { error: err.message || err };
			}

			res.writeHead(status, resHeaders);
			res.write(JSON.stringify(output));
			return res.end();
		})
}

const getBattingVsPitcher = (done) => {
	const playerArrayFinder = /.+this\.playerArray = (\[.+\]);\n/g;
	const pageCacheKey = 'batterVsPitcher';
	const currentPageCache = getPageCache(pageCacheKey); // pages are cached by day
	const batterVsPitcherDetails = {};
	let playersArray;

	if (currentPageCache) {
		console.log('getting cached batting vs pitcher');
		return done(null, currentPageCache);
	}

	axios(BATTER_VS_PITCHER_URL)
		.then(response => {
			let results = playerArrayFinder.exec(response.data);

			if (results && results[1]) {
				try {
					playersArray = JSON.parse(results[1]);
				} catch (e) {
					console.log(e);
					return done(new Error('Failed to parse players array.'));
				}
			} else {
				return done(new Error('Unable to find players array.'));
			}
			playersArray.forEach(player => {
				batterVsPitcherDetails[player.batter] = {
					'Batter Team': player.batter_team,
					Pitcher: player.pitcher,
					'Pitcher Team': player.pitcher_team,
					PA: player.pa,
					AB: player.ab,
					H: player.h,
					BB: player.bb,
					AVG: player.batting_avg
				}
			});
			setPageCache(pageCacheKey, batterVsPitcherDetails);
			return done(null, batterVsPitcherDetails);
		})
		.catch(done);
}

const getTopBatters = (res) => {
	let status = 200,
		batters = {};

	series()
		.first(cb => {
			getBattingAvgLeaders((err, data) => {
				if (err) return cb(err);
				batters.avg = data;
				return cb();
			});
		})
		.next(cb => {
			getHitsLeaders((err, data) => {
				if (err) return cb(err);
				batters.hits = data;
				return cb();
			});
		})
		.end(err => {
			if (err) {
				console.error('Error', err);
				status = 400;
				batters = { error: err };
			}

			res.writeHead(status, resHeaders);
			res.write(JSON.stringify(batters));
			return res.end();
		})
}

const getBattingAvgLeaders = (done) => {
	const pageCacheKey = 'battingLeaders';
	const currentPageCache = getPageCache(pageCacheKey);

	if (currentPageCache) {
		console.log('getting batting avg leaders from cached results');
		return done(null, extractBattingAvgFromLeadersPage(cheerio.load(currentPageCache)));
	}
	axios(BATTING_LEADERS_URL)
		.then(response => {
			const battingAvgLeadersDetails = extractBattingAvgFromLeadersPage(cheerio.load(response.data));
			if (!battingAvgLeadersDetails) {
				return done(new Error('Unable to get batters.'));
			}
			setPageCache(pageCacheKey, response.data);
			return done(null, battingAvgLeadersDetails);
		})
		.catch(done);
}

const getHitsLeaders = (done) => {
	const pageCacheKey = 'battingLeaders';
	const currentPageCache = getPageCache(pageCacheKey);

	if (currentPageCache) {
		console.log('getting hits leaders from cached results');
		return done(null, extractHitsFromLeadersPage(cheerio.load(currentPageCache)));
	}
	axios(BATTING_LEADERS_URL)
		.then(response => {
			const hitsLeadersDetails = extractHitsFromLeadersPage(cheerio.load(response.data));
			if (!hitsLeadersDetails) {
				return done(new Error('Unable to get batters.'));
			}
			setPageCache(pageCacheKey, response.data);
			return done(null, hitsLeadersDetails);
		})
		.catch(done);
}

const extractBattingAvgFromLeadersPage = ($) => {
	const batters = [];
	const battingAvgWrapper = $('#leaderboard_batting_batting_avg');
	battingAvgWrapper.find('.who').each((i, element) => {
		batters.push({
			name: $(element).find('a').attr('title').trim(),
			team: $(element).find('span').text().trim(),
			avg: $(element).next().text().trim()
		});
	});

	return batters;
}

const extractHitsFromLeadersPage = ($) => {
	const batters = [];
	const hitsWrapper = $('#leaderboard_batting_H');
	hitsWrapper.find('.who').each((i, element) => {
		batters.push({
			name: $(element).find('a').attr('title').trim(),
			team: $(element).find('span').text().trim(),
			hits: $(element).next().text().trim()
		});
	});

	return batters;
}

const setPageCache = (key, value) => {
	const currentDate = new Date().toDateString();
	const cacheDates = Object.keys(pageCache);

	if (!pageCache[currentDate]) {
		pageCache[currentDate] = {};
	}

	if (!pageCache[currentDate][key]) {
		pageCache[currentDate][key] = value;
	}

	// Clear old cache, only keep today's
	if (cacheDates.length > 1) {
		cacheDates.forEach(date => {
			if (date !== currentDate) {
				delete pageCache[date];
			}
		});
	}
}

const getPageCache = (key) => {
	const currentDate = new Date().toDateString();
	if (!pageCache[currentDate]) {
		pageCache[currentDate] = {};
	}
	return pageCache[currentDate][key];
}

server.listen(PORT);

console.log(`Server started on http://localhost:${PORT}`);