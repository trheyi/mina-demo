//app.js
//app.js
let config = require('config.js');

App({
	onLaunch: function () {
		this.xpm = require('xpmjs/xpm.js').option( config );
	},
	xpm: null
});