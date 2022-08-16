<template>
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
			<v-subheader class="subheader">{{title}}</v-subheader>
			<v-list-item v-for="(b, i) in batters" :key="i">
				<v-list-item-content>
					<v-list-item-title>
						<v-btn
							large
							v-if="b.bats"
							:text="batterSelected.name !== b.name"
							:color="teamSelected.colors.primary"
							:style="batterBtnStyles(b)"
							@click="$emit('select-batter', b)"
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
							@click="$emit('select-batter', b)"
						>
							({{b.team}}) {{b.name}} - {{b.avg || b.hits}}
						</v-btn>
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script>
export default {
	name: 'PitcherDetails',
	props: {
	},
	components: {
	},
	data() {
		return {
			isLoading: false
		}
	},
	methods: {
	}
}
</script>