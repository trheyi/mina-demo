/**
 * 下拉更新 + 触底分页
 * required xpmjs.utils
 */

class DataView {
	
	constructor( page, xpm, options ) {

		xpm = xpm || {};
		options = options || {};
		if ( typeof page == 'undefined' ) {
			console.error( '请指定 Page 对象', 'type=', typeof page, page );
			return;
		}

		if ( typeof xpm.require !== 'function' ) {
			console.error( '请指定 XpmJS 对象', 'type=', typeof xpm.require, xpm  );
			return;
		}

		this.xpm = xpm;
		this.page = page;
		this.utils = xpm.require('utils');
		this.options = this.utils.merge( DataView.DEFAULTS, options );

		// 调整高度
		this.fixheight( options['offsetHeight'] );

		return this;
	}

	/**
	 * 修复组件高度
	 * @return {[type]} [description]
	 */
	fixheight( offset ) {
		offset = offset || 0;
		let sys = wx.getSystemInfoSync();
		let height = sys.windowHeight - offset;
		this.setData({height:height});
		return height;
	}


	/**
	 * 更新数据集合
	 * @param {[type]} object [description]
	 */
	setData( object ) {
		let pdata = this.page.data || {};
		
		if ( ! this.utils.empty(this.options['prefix']) ) {
			if (typeof pdata[this.options['prefix']] == 'undefined' ) {
				pdata[this.options['prefix']] = {};
			}

			pdata[this.options['prefix']] = this.utils.merge(pdata[this.options['prefix']],object);

		} else {
			pdata = this.utils.merge(pdata, object);
		}

		this.page.setData(pdata);
	}


	/**
	 * 添加Items
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	pushItems( newItems ) {
		var items = this.getData('items') || [];
		for( var i in newItems){
			items.push(newItems[i]);
		}
	}


	resetData (object) {

		let pdata = this.page.data || {};
		if ( ! this.utils.empty(this.options['prefix']) ) {
			if (typeof pdata[this.options['prefix']] == 'undefined' ) {
				pdata[this.options['prefix']] = {};
			}
			for( var key in object ) {
				pdata[this.options['prefix']][key] = object[key];
			}

		} else {
			pdata = this.utils.merge(pdata, object);

			for( var key in object ) {
				pdata[key] = object[key];
			}
		}

		this.page.setData(pdata);
	}


	/**
	 * 读取数据集合
	 * @param   name [description]
	 * @return       [description]
	 */
	getData( name ) {
		let pdata = this.page.data || {};
		if ( ! this.utils.empty(this.options['prefix']) ) {
			 pdata[this.options['prefix']]  = pdata[this.options['prefix']] || {};
			return pdata[this.options['prefix']][name];
		}
		return pdata[name];
	}

	setOption(name, value) {
		this.options[name] = value;
	}


	/**
	 * 触底翻页
	 * @return {Function} [description]
	 */
	next() {

		let pinfo = this.getData('pinfo') || {};
		let next = pinfo['next'];
		if ( next == false) {
			this.error("已经到底了", 404);
			this.done();
			return;
		}

		let reqData = this.options['data'] || {};
		let pagevar = this.options['pagevar'] || '_page';
			reqData[pagevar] = next;
		this.setOption('data', reqData); // 下一页
		this.loading('Bottom');
		this.get();

		return this;
	}


	/**
	 * 上拉刷新
	 * @return {[type]} [description]
	 */
	refresh() {

		this.resetData({items:[], pinfo:{}});
		this.setData({items:[], pinfo:{}}, true);
		let reqData = this.options['data'] || {};
		let pagevar = this.options['pagevar'] || '_page';
			reqData[pagevar] = 1;
		this.setOption('data', reqData); // 下一页
		this.loading('Top');
		this.get();

		return this;
	}

	islocked() {
		if ( this.getData('locked') === true ) {
			return true;
		}

		return false;
	}

	lock(){
		this.setData({locked:true});
	}

	unlock(){
		console.log( 'unlock');
		this.setData({locked:false});	
	}

	loading( pos ) {
		pos = pos || 'Top';
		pos = 'loading' + pos;
		let dat = {};
		dat[pos] = true;
		dat['error'] = false,
		dat['errorMessage'] = "";
		this.setData(dat);
	}

	done() {

		this.setData({
			loadingTop:false,
			loadingBottom:false
		});
		this.unlock();
	}

	error( message,code ) {
		code = code || 500;
		this.setData({error:true, errorCode:code, errorMessage:message});
	}

	/**
	 * 请求数据
	 * @return {[type]} [description]
	 */
	get() {

		if ( this.islocked() ) {
			return;
		}

		var that = this;
		this.lock();

		if ( typeof this.options['api'] == 'undefined' ) {
			console.error('尚未提供数据源API', this.options );
			return;
		}

		let $dt = this.xpm.api( this.options['api'] );
		let query = this.options['query'] || {}
		let data = this.options['data'] || {}

		$dt( query ).post(data).then( function( resp ) {

			var pageinfo = resp;
			var data = resp['data'];
			delete pageinfo['data'];

			that.setData({pinfo:pageinfo});
			that.pushItems( data );
			that.done();

		}).catch( function( error ) {

			console.error('读取数据失败', error, that.options);

			let code =  error.code || 500;
			let message = error.message || "读取数据失败("+ code +")"
			that.error(message, code);
			that.done();
		});

	}

}

DataView.DEFAULTS = {
	prefix: "_dataview",
	pagevar:"page",
	offsetHeight:0
}
module.exports = DataView;