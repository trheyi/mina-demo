//app.js
App({
	onLaunch: function () {
		var host = 'wss.xpmjs.com';
		var option = {
			'app':1,
			'host':host,
			'https':host,
			'wss': host + '/ws-server',
			'table.prefix': 'demo',
			'user.table':'user',
			"appid": "wx0550a96041cf486c",
			"secret":"150698766059529|4990e4107dbfe85c045cf8bbd3508652",
			"user" : "/nhfpc/microsite/user/wxappLogin"
		}
		this.xpm = require("xpmjs/xpm.js").option(option);
	},
	xpm:null
});