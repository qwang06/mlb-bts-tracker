<template>
	<v-container>
		<v-row>
			<v-col>
				<v-card>
					<v-card-title>AL</v-card-title>
					<v-card-text>
						<v-btn
							text large
							v-for="(teamObj, key) in teams"
							v-if="teamObj.league === 'AL'"
							:key="key"
							:color="teamObj.colors.primary"
						>
							{{key}}
						</v-btn>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col>
				<v-card>
					<v-card-title>NL</v-card-title>
					<v-card-text>
						<v-btn
							text large
							v-for="(teamObj, key) in teams"
							v-if="teamObj.league === 'NL'"
							:key="key"
							:color="teamObj.colors.primary"
						>
							{{key}}
						</v-btn>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>
<script>
import teams from '../utils/teams.json';
console.log('teams', teams);
export default {
	name: 'TeamSelector',
	components: {
	},
	data() {
		return {
			teams
		}
	},
	methods: {
	}
}
</script>
<style scoped>
	
</style>