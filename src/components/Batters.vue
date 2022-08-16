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
				<v-btn class="update-btns" color="info" @click="updateColdPitchers">
					<v-icon>mdi-baseball-bat</v-icon>Cold Pitchers
				</v-btn>
			</v-col>
		</v-row>
		<TeamSelector @team-select="updateLineups" />
		<v-row>
			<v-col>
				<Lineup
					@select-batter="selectBatter"
					:title="battersTitle"
					:batters="batters"
					:batterSelected="batterSelected"
					:teamSelected="teamSelected"
					:batterVsPitcherDetails="batterVsPitcherDetails"
				/>
			</v-col>
			<v-col>
				<BatterDetails
					:details="batterDetails"
					:batterSelected="batterSelected"
				/>
			</v-col>
			<v-col v-if="showPitcherStats"></v-col>
		</v-row>
	</v-container>
</template>
<script>
import axios from 'axios';
import teams from '../utils/teams.json';
import TeamSelector from './TeamSelector.vue';
import Lineup from './Lineup.vue';
import BatterDetails from './BatterDetails.vue';
export default {
	name: 'Batters',
	components: {
		TeamSelector,
		Lineup,
		BatterDetails
	},
	data() {
		return {
			hasError: false,
			error: '',
			battersTitle: '',
			batterDetails: null,
			batterVsPitcherDetails: null,
			topBatters: null,
			isLoading: false,
			showPitcherStats: false,
			teamSelected: {},
			batterSelected: {},
			batters: [],
			lineups: {}
		}
	},
	methods: {
		selectBatter(batter) {
			console.log('batter', batter);
			this.batterDetails = this.batterVsPitcherDetails[batter.name];
			this.batterSelected = batter;
		},
		updateBatterVsPitcherDetails(done) {
			if (this.batterVsPitcherDetails) {
				return done();
			}
			axios(`http://localhost:9876/?q=batters`)
				.then(res => {
					this.batterVsPitcherDetails = res.data;
					return done();
				})
				.catch(err => {
					this.hasError = true;
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
		updateColdPitchers() {
			
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