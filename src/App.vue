<template>
	<v-app id="app">
		<Batters />
	</v-app>
</template>

<script>
import Batters from './components/Batters.vue';

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
	background-color: #f5f5f5;
}
.banner {
	text-transform: uppercase;
	padding: 20px;
	background-color: #002D72;
	color: white;
}
</style>
