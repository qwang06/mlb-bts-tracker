<template>
	<v-app id="app">
		<h1 class="banner">MLB Beat the Streak Tracker</h1>
		<Batters />
	</v-app>
</template>

<script>
import Batters from './components/Batters.vue'

export default {
	name: 'App',
	components: {
		Batters
	}
}
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
}
.banner {
	text-transform: uppercase;
	padding: 20px;
	background-color: #002D72;
	color: white;
}
</style>
