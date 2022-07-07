<template>
	<v-container>
		<v-snackbar v-model="hasError" color="error" top >
			{{error}}
				<template v-slot:action="{ attrs }">
					<v-btn text v-bind="attrs" @click="hasError = false">
						Close
					</v-btn>
				</template>
		</v-snackbar>
		<TeamSelector />
		<v-row>
			<v-col>
				<v-card :loading="isLoadingBatters">
					<template slot="progress">
						<v-progress-linear
							color="primary"
							height="5"
							indeterminate
						></v-progress-linear>
					</template>
					<v-list>
						<v-subheader class="subheader">{{battersTitleText}}</v-subheader>
						<v-list-item v-for="(b, i) in batters" :key="i">
							<v-list-item-content>
								<v-list-item-title>
									<v-btn
										text large
										v-if="b.team"
										:color="getTeamColor(b.team)"
										@click="getBatterDetails(b)"
									>
										({{b.team}}) {{b.name}} - {{b.avg}}
									</v-btn>
									<v-btn
										text large
										v-else
										:color="getTeamColor(teamSelected)"
										@click="getBatterDetails(b)"
									>
										{{b.name}}
									</v-btn>
								</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-card>
			</v-col>
			<v-col v-if="batterDetails">
				<v-card :loading="isLoadingBattingDetails">
					<template slot="progress">
						<v-progress-linear
							:color="getTeamColor(batterDetails.team)"
							height="5"
							indeterminate
						></v-progress-linear>
					</template>
					<v-card-title>{{batterDetails.name}}</v-card-title>
					<v-card-text>
						<v-simple-table>
							<template v-slot:default>
								<tbody>
									<tr v-for="(value, key) in batterDetails.vsPitcher" :key="key">
										<td v-if="key !== 'AVG'">{{key}}</td>
										<td v-else>
											<v-badge v-if="Number(value) < 0.300" dot left color="red">
												{{ key }}
											</v-badge>
											<v-badge v-else dot left color="green">
												{{ key }}
											</v-badge>
										</td>
										<td>{{value}}</td>
									</tr>
								</tbody>
							</template>
						</v-simple-table>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
		<v-row>
			<v-col>
				<v-btn color="primary" @click="scrapeBatters">Scrape Batters</v-btn>
				<v-btn color="primary" @click="scrapeLineups">Scrape Lineups</v-btn>
			</v-col>
		</v-row>
	</v-container>
</template>
<script>
import axios from 'axios';
import teams from '../utils/teams.json';
import TeamSelector from './TeamSelector.vue';
export default {
	name: 'Batters',
	components: {
		TeamSelector
	},
	data() {
		return {
			hasError: false,
			error: '',
			teamSelected: '',
			battersTitleText: '',
			batterDetails: null,
			isLoadingLineUps: false,
			isLoadingBattingDetails: false,
			isLoadingBatters: false,
			batters: [],
			lineUps: {}
		}
	},
	methods: {
		getTeamColor(team) {
			if (!team) {
				console.log('Name does not match any team', name);
				return 'primary';
			}
			if (!teams[team]) {
				console.log('Team not found?', teams);
				return 'primary';
			}
			return teams[team].colors.primary;
		},
		getBatterDetails(batter) {
			this.isLoadingBattingDetails = true;
			axios(`http://localhost:9876/?q=${encodeURIComponent(batter.name)}`)
				.then(res => {
					this.isLoadingBattingDetails = false;
					this.batterDetails = {
						...batter,
						vsPitcher: {
							Pitcher: res.data.vsPitcher.pitcher,
							'Pitcher\'s Team': res.data.vsPitcher.pitcherTeam,
							'Plate Appearances': res.data.vsPitcher.PA,
							'At-Bats': res.data.vsPitcher.AB,
							'Hits': res.data.vsPitcher.H,
							'Walks': res.data.vsPitcher.BB,
							'AVG': res.data.vsPitcher.AVG
						}
					};

					console.log(this.batterDetails.vsPitcher);
				})
				.catch(err => {
					this.isLoadingBattingDetails = false;
					this.hasError = true;
					this.error = 'Error getting batting details: ' + err.message;
				});
		},
		scrapeBatters(e) {
			this.isLoadingBatters = true;
			this.battersTitleText = 'Batting AVG Leaders';
			axios('http://localhost:9876/?q=all')
				.then(res => {
					this.isLoadingBatters = false;
					this.batters = res.data;
				})
				.catch(err => {
					this.isLoadingBatters = false;
					this.hasError = true;
					this.error = 'Error getting batting details: ' + err.message;
				});
		},
		scrapeLineups(e) {
			this.isLoadingLineUps = true;
			axios('http://localhost:9876/?q=lineups')
				.then(res => {
					this.isLoadingLineUps = false;
					this.lineUps = res.data;
				})
				.catch(err => {
					this.isLoadingLineUps = false;
					this.hasError = true;
					this.error = 'Error getting batting details: ' + err.message;
				});
		}
	}
}
</script>
<style scoped>
.subheader {
	font-size: 2rem;
	flex-direction: column;
}

.list-item-content {
	padding: 0 !important;
} 
</style>