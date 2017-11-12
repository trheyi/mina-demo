let DataView = require("../components/dataview.js");
let app = getApp();
Page({	
	data: {},
	dataview: null,
	onLoad:function(){
		this.dataview = new DataView( 
			this, app.xpm, {
				api:'nhfpc/microsite/company/search',
				offsetHeight:140
			}
		);
		this.dataview.refresh();
	},


	/**
	 * 下拉刷新
	 */
	onPullDownRefresh: function(e){
		this.dataview.refresh();
		wx.stopPullDownRefresh();
	},

	/**
	 * 按妞刷新
	 * @param  {[type]} e [description]
	 * @return {[type]}   [description]
	 */
	refresh: function(e) {
		this.dataview.refresh();
	},

	event_upper: function( e ){
		console.log('event_upper');
		// this.dataview.refresh();
	},


	/**
	 * 触底更新
	 * @param  {[type]} e [description]
	 * @return {[type]}   [description]
	 */
	event_lower: function(e){
		console.log('event_lower');
		this.dataview.next();
	},

	event_scroll: function(e){
		// console.log('event_scroll');
	}
});