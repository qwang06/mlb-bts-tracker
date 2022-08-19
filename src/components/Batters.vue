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
		<v-row>
			<v-col>
				<v-btn class="update-btns" color="info" @click="updateTopAvg">
					<v-icon>mdi-baseball-bat</v-icon>Top AVG
				</v-btn>
				<v-btn class="update-btns" color="info" @click="updateMostHits">
					<v-icon>mdi-baseball-bat</v-icon>Most Hits
				</v-btn>
			</v-col>
		</v-row>
		<TeamSelector @team-select="updateLineups" />
		<v-row>
			<v-col>
				<LineUp
					@select-batter="selectBatter"
					:isLoading="isLoading"
					:title="battersTitle"
					:batters="batters"
					:batterSelected="batterSelected"
					:teamSelected="teamSelected"
					:batterVsPitcherDetails="batterVsPitcherDetails"
				/>
			</v-col>
			<v-col>
				<BatterDetails
					@get-pitcher-details="getPitcherDetails"
					:isLoadingBatterDetails="isLoadingBatterDetails"
					:details="batterDetails"
					:batterSelected="batterSelected"
					:teamSelected="teamSelected"
				/>
			</v-col>
			<v-col v-if="showPitcherStats">
				<PitcherDetails
					:details="pitcherDetails"
					:isLoading="isLoadingPitcherDetails"
					:pitcherSelected="pitcherSelected"
				/>
			</v-col>
		</v-row>
	</v-container>
</template>
<script>
import axios from 'axios';
import teams from '../utils/teams.json';
import TeamSelector from './TeamSelector.vue';
import LineUp from './LineUp.vue';
import BatterDetails from './BatterDetails.vue';
import PitcherDetails from './PitcherDetails.vue';
export default {
	name: 'Batters',
	components: {
		TeamSelector,
		LineUp,
		BatterDetails,
		PitcherDetails
	},
	data() {
		return {
			hasError: false,
			error: '',
			battersTitle: '',
			batterDetails: null,
			pitcherDetails: null,
			batterVsPitcherDetails: null,
			topBatters: null,
			isLoading: false,
			isLoadingBatterDetails: false,
			isLoadingPitcherDetails: false,
			showPitcherStats: false,
			teamSelected: {},
			batterSelected: {},
			pitcherSelected: {},
			batters: [],
			lineups: {}
		}
	},
	methods: {
		selectBatter(batter) {
			this.batterDetails = this.batterVsPitcherDetails[batter.name];
			this.batterSelected = batter;
		},
		updateBatterVsPitcherDetails(done) {
			this.isLoadingBatterDetails = true;
			if (this.batterVsPitcherDetails) {
				this.isLoadingBatterDetails = false;
				return done();
			}
			axios(`http://localhost:9876/?q=batterVsPitcher`)
				.then(res => {
					this.batterVsPitcherDetails = res.data;
					this.isLoadingBatterDetails = false;
					return done();
				})
				.catch(err => {
					this.hasError = true;
					this.isLoadingBatterDetails = false;
					this.error = 'Error getting batting details: ' + err.message;
					return done();
				});
		},
		updateTopAvg(e) {
			this.isLoading = true;
			this.battersTitle = 'Top AVG Leaders';
			this.updateBatterVsPitcherDetails(() => {
				if (this.topBatters) {
					this.isLoading = false;
					this.batters = this.topBatters.avg;
					this.selectBatter(this.batters[0]);
					return;
				}
				axios('http://localhost:9876/?q=top')
					.then(res => {
						this.topBatters = res.data;
						this.isLoading = false;
						this.batters = res.data.avg;
						this.selectBatter(this.batters[0]);
					})
					.catch(err => {
						this.isLoading = false;
						this.hasError = true;
						this.error = 'Error getting batting details: ' + err.message;
					});
			});
		},
		updateMostHits(e) {
			this.isLoading = true;
			this.battersTitle = 'Hits Leaders';
			this.updateBatterVsPitcherDetails(() => {
				if (this.topBatters) {
					this.isLoading = false;
					this.batters = this.topBatters.hits;
					this.selectBatter(this.batters[0]);
					return;
				}
				axios('http://localhost:9876/?q=top')
					.then(res => {
						this.topBatters = res.data;
						this.isLoading = false;
						this.batters = res.data.hits;
						this.selectBatter(this.batters[0]);
					})
					.catch(err => {
						this.isLoading = false;
						this.hasError = true;
						this.error = 'Error getting batting details: ' + err.message;
					});
			});
		},
		updateLineups(teamObj, team) {
			this.isLoading = true;
			this.battersTitle = team + ' Line Up';
			this.teamSelected = { team, ...teamObj };
			this.updateBatterVsPitcherDetails(() => {
				if (!this.lineups[teamObj.name]) {
					axios('http://localhost:9876/?q=lineups')
						.then(res => {
							this.isLoading = false;
							this.lineups = res.data;
							this.displayLineups(teamObj, team);
						})
						.catch(err => {
							this.isLoading = false;
							this.hasError = true;
							this.error = 'Error getting line ups: ' + err.message;
						});
				} else {
					this.isLoading = false;
					this.displayLineups(teamObj, team);
				}
			});
		},
		displayLineups(teamObj, team) {
			if (!this.lineups[teamObj.name]) {
				this.hasError = true;
				this.error = 'Line up not found. Are they playing today?';
			} else {
				this.batters = this.lineups[teamObj.name].map(batter => ({ ...batter }));
				this.selectBatter(this.batters[0]);
			}
		},
		getTeamInitials(teamName) {
			// `teamName` is the name of the team without the city/state
			return Object.keys(teams).filter(teamInitial => teams[teamInitial].name === teamName.toLowerCase()).pop();
		},
		getPitcherDetails(pitcherName) {
			const team = this.getTeamInitials(this.batterDetails['Pitcher Team']);
			this.showPitcherStats = true;
			this.isLoadingPitcherDetails = true;
			this.pitcherSelected = {
				name: pitcherName,
				team
			}

			axios(`http://localhost:9876/?q=pitcher&n=${pitcherName}&t=${team}`)
				.then(res => {
					this.isLoadingPitcherDetails = false;
					this.pitcherDetails = res.data;
					console.log('res', res.data);
				})
				.catch(err => {
					this.hasError = true;
					this.isLoadingPitcherDetails = false;
					this.error = 'Error getting pitcher details: ' + err.message;
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
.update-btns {
	margin: 0 5px;
}
.update-btns .v-icon {
	padding-right: 10px;
}
</style>