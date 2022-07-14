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
		<TeamSelector @team-select="updateLineUps" />
		<v-row>
			<v-col>
				<v-card :loading="isLoading">
					<template slot="progress">
						<v-progress-linear
							color="primary"
							height="5"
							indeterminate
						></v-progress-linear>
					</template>
					<v-skeleton-loader
						v-if="isLoading"
						class="mx-auto"
						max-width="300"
						type="list-item,list-item,list-item,list-item,list-item,list-item,list-item,list-item,list-item"
					></v-skeleton-loader>
					<v-list v-if="!isLoading && batters.length">
						<v-subheader class="subheader">{{battersTitleText}}</v-subheader>
						<v-list-item v-for="(b, i) in batters" :key="i">
							<v-list-item-content>
								<v-list-item-title>
									<v-btn
										large
										v-if="b.bats"
										:text="batterSelected.name !== b.name"
										:color="teamSelected.colors.primary"
										:style="batterBtnStyles(b)"
										@click="selectBatter(b)"
									>
										<v-badge dot left :color="batterVsPitcherDetails[b.name] && batterVsPitcherDetails[b.name].AVG < 0.300 ? 'red' : 'green'">
											({{b.bats}}) {{b.name}}
										</v-badge>
									</v-btn>
									<v-btn
										large
										v-else
										:text="batterSelected.name !== b.name"
										:color="getTeamColors(b.team).primary"
										:style="batterBtnStyles(b)"
										@click="selectBatter(b)"
									>
										({{b.team}}) {{b.name}} - {{b.avg || b.hits}}
									</v-btn>
								</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-card>
			</v-col>
			<v-col>
				<v-card>
					<v-card-title v-if="batterSelected.name">{{batterSelected.name}}</v-card-title>
					<v-card-text v-if="batterDetails">
						<v-simple-table>
							<template v-slot:default>
								<tbody>
									<tr v-for="(value, key) in batterDetails" :key="key">
										<td v-if="key !== 'AVG'">{{key}}</td>
										<td v-else>
											<v-badge dot left :color="Number(value) < 0.300 ? 'red' : 'green'">
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
			battersTitleText: '',
			batterDetails: null,
			batterVsPitcherDetails: null,
			topBatters: null,
			isLoading: false,
			teamSelected: {},
			batterSelected: {},
			batters: [],
			lineUps: {}
		}
	},
	methods: {
		batterBtnStyles(batter) {
			const isBatterSelected = this.batterSelected.name !== batter.name;
			const teamColors = this.getTeamColors(batter.team || this.teamSelected.team);
			return { color: isBatterSelected ? teamColors.primary : teamColors.secondary }
		},
		getTeamColors(team) {
			if (!team) {
				console.log('Name does not match any team', name);
				return { primary: 'primary', secondary: 'accent' };
			}
			if (!teams[team]) {
				console.log('Team not found?', teams);
				return { primary: 'primary', secondary: 'accent' };
			}
			return teams[team].colors;
		},
		selectBatter(batter) {
			this.batterDetails = this.batterVsPitcherDetails[batter.name];
			this.batterSelected = batter;
		},
		updateBatterVsPitcherDetails() {
			axios(`http://localhost:9876/?q=batters`)
				.then(res => {
					this.batterVsPitcherDetails = res.data;
				})
				.catch(err => {
					this.hasError = true;
					this.error = 'Error getting batting details: ' + err.message;
				});
		},
		updateTopAvg(e) {
			this.isLoading = true;
			this.battersTitleText = 'Top AVG Leaders';
			if (!this.batterVsPitcherDetails) {
				this.updateBatterVsPitcherDetails();
			}
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
		},
		updateMostHits(e) {
			this.isLoading = true;
			this.battersTitleText = 'Hits Leaders';
			if (!this.batterVsPitcherDetails) {
				this.updateBatterVsPitcherDetails();
			}
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
		},
		updateLineUps(teamObj, team) {
			this.isLoading = true;
			this.battersTitleText = team + ' Line Up';
			this.teamSelected = { team, ...teamObj };
			if (!this.batterVsPitcherDetails) {
				this.updateBatterVsPitcherDetails();
			}

			if (!this.lineUps[teamObj.name]) {
				axios('http://localhost:9876/?q=lineups')
					.then(res => {
						this.isLoading = false;
						this.lineUps = res.data;
						this.displayLineUps(teamObj, team);
					})
					.catch(err => {
						this.isLoading = false;
						this.hasError = true;
						this.error = 'Error getting line ups: ' + err.message;
					});
			} else {
				this.isLoading = false;
				this.displayLineUps(teamObj, team);
			}
		},
		displayLineUps(teamObj, team) {
			this.batters = this.lineUps[teamObj.name].map(batter => ({ ...batter }));
			this.selectBatter(this.batters[0]);
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