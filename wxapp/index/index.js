//index.js
//获取应用实例
const app = getApp();

Page({
	data: {
		pages: [
			{name:"User", route:"/demo/user"}
		],
		components: [
			{name:"上拉翻页组件", route:"/com/list"}
		]
	},

	navigateTo: function( e  ) {

		var data = e.target.dataset;

		if ( typeof data.route != 'undefined') {
			wx.navigateTo({
				url: data.route,
				fail: function( e ){
					e.errMsg = e.errMsg || "跳转页面失败";
					wx.showModal({
						title:'载入页面失败', 
						content: e.errMsg,
						showCancel:false
					});
				}
			})
		}
	},


	onLoad: function () {
		this.jobs();
	},

	jobs: function(){

		console.log(`%c 欢迎加入我们! 请发送简历到 jobs@diancloud.com `, 'color: #d26a5c;font-size:20px;font-weight:600');
		console.log(`%c 云端应用开发工程师 `,  'color: #5c90d2;font-size:20px;font-weight:600');
		console.log(`%c 岗位职责`, 'color: #646464;font-size:16px;font-weight:600');
		console.log(`%c 负责 XpmJS-Server 开发维护；( https://gitee.com/xpmjs/xpmjs ) 
 负责 XpmJS JSSDK 开发维护；
 负责 XpmJS-Server 云端应用开发维护;

`,'color: #646464;font-size:16px;font-weight:300');

		console.log(`%c 任职要求`, 'color: #646464;font-size:16px;font-weight:600');
		console.log(`%c 2年以上PHP开发经验；
 熟悉 PHP、MySQL、JavaScript、HTML、CSS语言；
 熟练掌握至少一种MVC开发框架；
 熟悉Linux系统常用命令；

`,'color: #646464;font-size:16px;font-weight:300');

	}
})
