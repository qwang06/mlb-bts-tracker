<template>
	<v-card :loading="isLoadingBatterDetails">
		<v-card-title v-if="batterSelected.name">{{batterSelected.name}}</v-card-title>
		<v-card-text v-if="details">
			<v-simple-table>
				<template v-slot:default>
					<thead>
						<tr>
							<th colspan="2">VS pitcher</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(value, key) in details" :key="key">
							<td v-if="key !== 'AVG'">{{key}}</td>
							<td v-else>
								<v-badge dot left :color="Number(value) < 0.300 ? 'red' : 'green'">
									{{ key }}
								</v-badge>
							</td>
							<td v-if="key === 'Pitcher'">
								<v-btn @click="$emit('get-pitcher-details', value)">{{value}}</v-btn>
							</td>
							<td v-else>{{value}}</td>
						</tr>
					</tbody>
				</template>
			</v-simple-table>
			<v-btn
				large
				text
				v-if="!moreStats[batterSelected.name]"
				@click="getMoreStats"
				:loading="isLoading"
			>
				Get more stats!
			</v-btn>
			<v-simple-table v-else>
				<template v-slot:default>
					<thead>
						<tr>
							<th colspan="2">Last 30 days</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(value, key) in moreStats[batterSelected.name]" :key="key">
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
</template>

<script>
import axios from 'axios';
export default {
	name: 'BatterDetails',
	props: {
		isLoadingBatterDetails: Boolean,
		batterSelected: Object,
		teamSelected: Object,
		details: Object
	},
	components: {
	},
	data() {
		return {
			isLoading: false,
			moreStats: {}
		}
	},
	methods: {
		getMoreStats(e) {
			this.isLoading = true;
			const teamSelected = this.batterSelected.team || this.teamSelected.team;
			const query = `q=more&n=${this.batterSelected.name}&t=${teamSelected}`;

			if (this.moreStats[this.batterSelected.name]) {
				return;
			}

			axios('http://localhost:9876/?' + query)
				.then(res => {
					this.isLoading = false;
					this.moreStats[this.batterSelected.name] = res.data;
				})
				.catch(err => {
					this.isLoading = false;
					this.hasError = true;
					this.error = 'Error getting line ups: ' + err.message;
				});
		}
	}
}
</script>