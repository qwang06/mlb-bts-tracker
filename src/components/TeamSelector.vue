<template>
	<v-row>
		<v-col>
			<v-card>
				<v-card-title>AL</v-card-title>
				<v-card-text>
					<v-btn
						x-large
						fab
						v-for="(teamObj, team) in teams"
						v-if="teamObj.league === 'AL'"
						:key="team"
						:color="teamObj.colors.primary"
						:style="{ color: teamObj.colors.secondary, margin: '5px' }"
						@click="$emit('team-select', teamObj, team)"
					>
						{{team}}
					</v-btn>
				</v-card-text>
			</v-card>
		</v-col>
		<v-col>
			<v-card>
				<v-card-title>NL</v-card-title>
				<v-card-text>
					<v-btn
						x-large
						fab
						v-for="(teamObj, team) in teams"
						v-if="teamObj.league === 'NL'"
						:key="team"
						:color="teamObj.colors.primary"
						:style="{ color: teamObj.colors.secondary, margin: '5px' }"
						@click="$emit('team-select',teamObj, team)"
					>
						{{team}}
					</v-btn>
				</v-card-text>
			</v-card>
		</v-col>
	</v-row>
</template>
<script>
import teams from '../utils/teams.json';
export default {
	name: 'TeamSelector',
	components: {
	},
	data() {
		return {
			teams
		}
	}
}
</script>
<style scoped>
	
</style>