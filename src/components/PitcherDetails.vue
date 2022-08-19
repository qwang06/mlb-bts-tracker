<template>
	<v-card :loading="isLoading">
		<v-card-title v-if="pitcherSelected.name">{{pitcherSelected.name}}</v-card-title>
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
			type="table"
		></v-skeleton-loader>
		<v-card-text v-if="details">
			<v-simple-table>
				<template v-slot:default>
					<tbody>
						<tr v-for="(value, key) in details" :key="key">
							<td>{{key}}</td>
							<td>{{value}}</td>
						</tr>
					</tbody>
				</template>
			</v-simple-table>
		</v-card-text>
	</v-card>
</template>

<script>
export default {
	name: 'PitcherDetails',
	props: {
		details: Object,
		pitcherSelected: Object,
		isLoading: Boolean
	},
	components: {
	},
	data() {
		return {
		}
	},
	methods: {
	}
}
</script>