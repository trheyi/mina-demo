import World from '../common/world.js';

let web = getWeb();
Page({
	data:{},
	
	onReady: function( get ) {
		let ping = "这是中文字符串 DONEHELLO POING";
		this.world = new World(get['name'], { param:'ok', get:get });
		console.log( ping );
		console.log( 'page onReady data=', data ,  ' web.title=', web.title );
	},

	hello: function ( event ) {
		this.world.pong();
		this.setData({title:'HELLO WORLD MPWORLD!' + new Date() });
	},

	world: null
})