let path = require('path');
let fs = require('fs');
let del = require('del');


let gulp = require('gulp');
var gutil = require('gulp-util');
var tap = require('gulp-tap');
let replace = require('gulp-replace');
let sourcemaps = require('gulp-sourcemaps');
let uglify = require('gulp-uglify');
let browserify = require('browserify');
let less = require('gulp-less');
let upload = require('gulp-upload');
let zip = require('gulp-zip');


let include = require(path.resolve('./gulp-plugins/include'));
let include_import = require(path.resolve('./gulp-plugins/import'));
let sync = require(path.resolve("./gulp-plugins/sync"));

// 系统信息
let __WEB_ROOT__ = path.resolve(__dirname, './web');


let CONF = require(path.resolve('./config.js'));
let WEB_CONF = JSON.parse(fs.readFileSync( path.resolve(__dirname, './web/web.json') ));
let WEB_PAGES = WEB_CONF['pages'] || [];
let WEB_COMMONS = WEB_CONF['common'] || [];
	WEB_COMMONS.push('/web.js') ;
	WEB_COMMONS.push('/web.json') ;
	WEB_COMMONS.push('/web.less') ;
	
let WEB_STORAGE = WEB_CONF['storage'] || [];



// 全局变量
let TMP_PATH = path.resolve(__dirname + '/.tmp');
let CACHE_PATH = path.resolve(__dirname + '/.cache');
let BUILD_PATH = CONF.mina['target'] || TMP_PATH;


/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item));
}


function isPage( file ) {
	for( let idx in WEB_PAGES ) {
		let fullpath = __WEB_ROOT__ + WEB_PAGES[idx].toString();
		if (  inDir( file, fullpath ) ) return true;
	}
}

function isAsset( file ) {
	let binds = _stor_binds();
	for ( let idx in binds ) {
		let fullpath = __dirname + binds[idx]['local'].toString();
		if (  inDir( file, fullpath ) ) return true;
	}
}

function isCommon( file ) {
	for( let idx in WEB_COMMONS ) {
		let fullpath = __WEB_ROOT__ + WEB_COMMONS[idx].toString();
		if (  inDir( file, fullpath ) ) return true;
	}

	return false;
}

function inDir( file, path ) {
	if ( file === path ) return true;

	let pos = file.toString().indexOf(path.toString());
	// console.log( ' path=' ,path.toString(),  ' file=', file.toString(),  '  pos=', pos );

	if ( pos === 0 ) {
		return true;
	}
	return false;
}




/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function objectMerge(target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				objectMerge(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return objectMerge(target, ...sources);
}



// 全局函数
function uploadFile( file, options={}  ) { // 上传文件到指定地址
		
	// options['data'] = options['data'] || {};
	// objectMerge(options['data'], {
	// 	appid: conf.appid,
	// 	secret: conf.secret,
	// 	project: conf.project
	// });

	return new Promise(function( resolve, reject){
		let conf = CONF.mina;
		let params = {
			server:conf.server + '/_a/mina/dev/compile',
			headers:{ "Accept":"application/json"},
			data:{
				appid: conf.appid,
				secret: conf.secret,
				project: conf.project
			},
			callback: function (err, data, res) {

				res = res || {};

				if ( WEB_CONF['debug'] === true ) {
					gutil.log( '========== DEBUG HTTP RESPONSE CODE: ' , res.statusCode ,  "==============");
					gutil.log( '========== DEBUG HTTP RESPONSE BODY:  ==================\n' , data.toString(), "\n===================================================================");
				}

				if (err) {
			      gutil.log('error:' + err.toString());
			    } else {
			    	try {
			    		let parsedData = JSON.parse(data.toString() );

			    		if ( typeof parsedData['code'] != 'undefined' && parsedData['code'] != 0 && typeof parsedData['message'] != 'undefined' ) {

			    			let trace = parsedData['trace'] || [];
			    			let extra = parsedData['extra'] || {};
			    			
							reject({
								code: parsedData['code'], 
								message:parsedData['message'], 
								trace: trace,
								extra: objectMerge( extra, {statusCode:res.statusCode})
							});
						}

						resolve( parsedData );
						return;

			    	} catch( e ) {
			    		reject({
							code:500, 
							message:'JSON 解析错误', 
							extra:{statusCode:res.statusCode, body:data.toString()}
						});
						return;
			    	}
			    }
			}
		};

		if (!fs.existsSync(file)) {
			reject({
				code:404,
				message:'文件不存在', 
				extra:{file:file}
			});

			return;
		}

		objectMerge( params, options );
		gulp.src( file ).pipe( upload(params) );
	})
}

// 存储API
function _stor( options = {} ) {
	let engine = WEB_STORAGE['engine'] || 'local';
	let opts = {};
	objectMerge(opts,  WEB_STORAGE['options'], options);
	let Storage = require('./gulp-plugins/storage/' + engine );
	return new Storage( opts );
}

// 静态页面
function _stor_binds() {
	return WEB_STORAGE['binds'] || [];
}

// 页面文件存储地址
function _stor_pages() {
	return WEB_STORAGE['pages'] || [];
}


// 将一个 ES6 JS 翻译成  ES5 JS 
function compileScript( src ) {

	let script = src.replace(__WEB_ROOT__, '');
	let scriptArr = script.split('.');
	let dst = '/web' + scriptArr[0];

	if ( scriptArr[1] != 'js') return;

	return new Promise( function( resolve, reject) {
		let out = path.resolve(BUILD_PATH, dst + '/../');
		gutil.log('编译' + dst + '.js ...');
		gulp.src(src)
			.pipe(tap(function (file) {
				let b = browserify(file.path);
				file.contents = b.transform("babelify", {presets: ["es2015"]}).bundle();
			})).on('error', reject)
			.pipe(gulp.dest(out)).on('end', resolve);
	});
}


// 复制页面配置
function copyJSON( src ) {

	let script = src.replace(__WEB_ROOT__, '');
	let scriptArr = script.split('.');
	let dst = '/web' + scriptArr[0];

	if ( scriptArr[1] != 'json') return;

	return new Promise( function( resolve, reject) {
		let out =  BUILD_PATH + path.resolve(dst + '/../');
		gutil.log('复制' + dst + '.json ...');
		pipe = gulp.src(src)
			.pipe(gulp.dest(out)).on('end', resolve);
	});

}

// 编译样式
function compileStyle ( src ){

	let script = src.replace(__WEB_ROOT__, '');
	let scriptArr = script.split('.');
	let dst = '/web' + scriptArr[0];

	if ( scriptArr[1] != 'less') return;

	return new Promise( function( resolve, reject) {
		let out =  BUILD_PATH + path.resolve(dst + '/../');
		gutil.log('编译' + dst + '.less ...');
		pipe = gulp.src(src)
			.pipe(less({
				paths:[__WEB_ROOT__]
			})).on('error', reject)
			.pipe(gulp.dest(out)).on('end', resolve);
	});
}

// 合并页面
function mergePage( src ){

	let script = src.replace(__WEB_ROOT__, '');
	let scriptArr = script.split('.');
	let dst = '/web' + scriptArr[0];

	if ( scriptArr[1] != 'page') return;

	return new Promise( function( resolve, reject) {
		let out =  BUILD_PATH + path.resolve(dst + '/../');
		gutil.log('合并' + dst + '.page ...');
		pipe = gulp.src(src)
			.pipe(replace(/__WEB_ROOT__/g, __WEB_ROOT__)).on('error', reject)
			.pipe(include()).on('error', reject)
			.pipe(include_import()).on('error', reject);

		binds = _stor_binds();
		for( let i=0; i<binds.length; i++ ) {
			// {{__STOR__::/deepblue/assets}}
			let bind = binds[i];
			let reg = new RegExp("\{\{__STOR__\:\:"+bind['remote']+"\}\}", "g");
			if ( WEB_CONF['debug'] === true ) { 
				pipe.pipe(replace(reg, bind['origin'])).on('error', reject);
			} else {
				pipe.pipe(replace(reg, bind['url'])).on('error', reject);
			}
		}

		pipe.pipe(gulp.dest(out)).on('end', resolve);
	});

}

// 上传一个页面
function compilePage( src ) {
	let script = src.replace(__WEB_ROOT__, '');
	let scriptArr = script.split('.');
	let dst = '/web' + scriptArr[0];
	let page = scriptArr[0];
	let webpath =  BUILD_PATH + path.resolve('/web');
	let dirs = page.split('/');
		dirs[1] = '+('+dirs[1]+')'

	return new Promise( function( resolve, reject) {

		let zipfile = 'web' + page.replace(/\//g,'_') + '.zip';
		let pageroot = BUILD_PATH + '/web' + dirs.join('/') +  '.*';
		// console.log(pageroot, dirs);
		// var glob = require('glob');
		// glob(pageroot, function(err, files) {
		//     console.log(files);
		// });

		gulp.src(  pageroot )
			.pipe(zip(zipfile))
			.pipe(gulp.dest(BUILD_PATH))
			.on('end', function(){
				
				uploadFile( BUILD_PATH + '/' + zipfile, { data:{
					type:"zip",
					page:page
				}})
				.then(function(resp){
					gutil.log( '编译' + dst + '.page 完毕' );
					resolve(zipfile);
				})
				.catch(function(error){
					gutil.log( error );
				})
			});
	});

}


// JavsScript ES6 -> ES5 
function web_script() {

	let scripts = {
		"/web/web.js": path.join(path.resolve(__dirname, './web') ,  '/web.js')
	};
	
	WEB_PAGES.map(function( name, idx ){
		scripts['/web' + name ] =  path.join(path.resolve(__dirname, './web' ) , name + '.js');
	});

	let tasks = [];

	for( let dst in scripts) {
		tasks.push(new Promise( function( resolve, reject) {
			let src = path.resolve(scripts[dst]);
			let out = path.join(BUILD_PATH, path.resolve(dst + '/../'));

			gutil.log('编译' + dst + '.js ...');
				gutil.log('\tBUILD_PATH=', BUILD_PATH) ;
				gutil.log('\tdst=', dst); 
				gutil.log('\tsrc=', dst); 
				gutil.log('\tout=',  out );

			gulp.src(src).on('error', reject)
				.pipe(tap(function (file) {
					let b = browserify(file.path);
					file.contents = b.transform("babelify", {presets: ["es2015"]}).bundle();
				})).on('error', reject)
				.pipe(gulp.dest(out)).on('error', reject).on('end', resolve);
		}));
	}

	return Promise.all(tasks);
}

// Copy JSON DATA 
function web_json() {
	let scripts = {
		"/web/web.json": path.join(path.resolve(__dirname, './web') ,  '/web.json')
	};
	
	WEB_PAGES.map(function( name, idx ){
		scripts['/web' + name ] = path.join(path.resolve(__dirname, './web' ) , name + '.json');
	});

	let tasks = [];
	for( let dst in scripts) {
		tasks.push(new Promise( function( resolve, reject) {
		
			let src = path.resolve(scripts[dst]);
			let out = path.join(BUILD_PATH, path.resolve(dst + '/../'));
			gutil.log('复制' + dst + '.json ...');
				gutil.log('\tBUILD_PATH=', BUILD_PATH) ;
				gutil.log('\tdst=', dst); 
				gutil.log('\tsrc=', dst); 
				gutil.log('\tout=',  out );

			pipe = gulp.src(src).on('error', reject)
				.pipe(gulp.dest(out)).on('error', reject).on('end', resolve);
		}));
	}

	return  Promise.all(tasks);
}



// Style Less -> css
function web_style() {
	let pipe = null;
	let scripts = {
		"/web/web.less": path.resolve(__dirname, './web') +  '/web.less'
	};
	
	WEB_PAGES.map(function( name, idx ){
		scripts['/web' + name ] =  path.resolve(__dirname, './web' ) + name + '.less';
	});
	
	let tasks = [];
	for( let dst in scripts) {
		tasks.push(new Promise( function( resolve, reject) {
			let src = scripts[dst];
			let out =  BUILD_PATH + path.resolve(dst + '/../');
			gutil.log('编译' + dst + '.less ...');
			pipe = gulp.src(src).on('error', reject)
				.pipe(less({
					paths:[__WEB_ROOT__]
				})).on('error', reject)
				.pipe(gulp.dest(out)).on('error', reject).on('end', resolve);
		}));
	}

	return  Promise.all(tasks);
}


// Page Merge
function web_page(){
	let scripts = {};
	let binds = _stor_binds();
	
	WEB_PAGES.map(function( name, idx ){
		scripts['/web' + name ] =  path.resolve(__dirname, './web' ) + name + '.page';
	});


	let tasks = [];
	for( let dst in scripts) {

		tasks.push(new Promise( function( resolve, reject) {
			let src = scripts[dst];
			let out =  BUILD_PATH + path.resolve(dst + '/../');
			gutil.log('合并' + dst + '.page ...');
			pipe = gulp.src(src).on('error', reject)
				.pipe(replace(/__WEB_ROOT__/g, __WEB_ROOT__)).on('error', reject)
				.pipe(include()).on('error', reject)
				.pipe(include_import()).on('error', reject);

			for( let i=0; i<binds.length; i++ ) {
				// {{__STOR__::/deepblue/assets}}
				let bind = binds[i];
				let reg = new RegExp("\{\{__STOR__\:\:"+bind['remote']+"\}\}", "g");
				if ( WEB_CONF['debug'] === true ) { 
					pipe.pipe(replace(reg, bind['origin'])).on('error', reject);
				} else {
					pipe.pipe(replace(reg, bind['url'])).on('error', reject);
				}
			}

			pipe.pipe(gulp.dest(out)).on('error', reject).on('end', resolve);
		}));
	}

	return  Promise.all(tasks);
}



// 清空编译环境
gulp.task('clean', function() {
	return del.sync([BUILD_PATH]);
});

gulp.task('dist-clean', function() {
	del.sync([BUILD_PATH]);
	del.sync([CACHE_PATH]);
});

// ************************************************************************
//     WEB 端编译
// ************************************************************************

// JavsScript ES6 -> ES5 
gulp.task('web-script', function(){

	return web_script().then( function(){
		gutil.log('web-script 完成');
	}).catch(function(){
		gutil.log('web-script 错误');
	});

});


// Copy JSON DATA 
gulp.task('web-json', function(){

	return web_json().then( function(){
		gutil.log('web-json 完成');
	}).catch(function(){
		gutil.log('web-json 错误');
	});

});


// Style Less -> css
gulp.task('web-style', function(){

	return web_style().then( function(){
		gutil.log('web-style 完成');
	}).catch(function(){
		gutil.log('web-style 错误');
	});

});

// Page Merge
gulp.task('web-page', function(){

	return web_page().then( function(){
		gutil.log('web-style 完成');
	}).catch(function(){
		gutil.log('web-style 错误');
	});
	
});


// Page package
gulp.task('web-zip', function( cb ){

	let webpath =  BUILD_PATH + path.resolve('/web');
	return new Promise( function( resolve, reject ) {
		Promise.all([web_json(), web_script(),web_page(), web_style()]).then(function(){
			gulp.src( webpath + '/**/**/**/*').on('error', reject)
				.pipe(zip('web.zip')).on('error', reject)
				.pipe(gulp.dest(BUILD_PATH)).on('error', reject).on('end', resolve);
			gutil.log('web-zip 完成');
		});
	});
	
});


// Page Upload & Compile
gulp.task('web-compile', ['web-sync-page'], function() {

	let task = new Promise( function( resolve, reject ) {

		uploadFile( BUILD_PATH + '/web.zip', { data:{
				type:"zip"
			}})
			.then(function(resp){
				gutil.log( '编译成功' );
				resolve(resp);
			})
			.catch(function(error){
				let message =  error['message'] ||  '未知错误';
				let trace = error['trace'] || [];
				let extra = error['extra'] || [];
				let file = extra['file'] || '未知文件';
				let line = extra['line'] || '未知行号';

				gutil.log( '编译失败:', message, file, line );
				gutil.log(error);

				for( let idx in trace ) {
					let t = trace[idx];
					gutil.log( "\t" , t['class'],  t['function'], t['file'] , t['line']  ) ;
				}
				reject(error);

			})
	});

	return task.then(function(){
		gutil.log('web-compile 完成');
	}).catch( function(){
		gutil.log('web-compile 错误');
	});
});




// Sync static file to CDN
gulp.task('web-sync-static', function() {

	let binds = _stor_binds();
	let stor = _stor();
	let pip = null;

	let tasks = [];
	binds.forEach(function( bind ) {
		tasks.push(new Promise( function( resolve, reject) {
			gulp.src('').on('error', reject)
				.pipe(sync( __dirname + bind.local, bind.remote, {
					stor:stor,
					printSummary:true,
					nodelete:false		
				})).on('error', reject).on('end', resolve)
		}));
	});

	return  Promise.all(tasks).then( function(){
		gutil.log('web-sync-static 完成');
	});
	
});




// 同步 JS 文件 和 CSS 文件到存储器
gulp.task('web-sync-page', ['web-zip'], function(){
	let stor = _stor({ignore:[/^\./,/\.page$/,/\.json$/]});
	let pages = _stor_pages();
	let fullsrc = BUILD_PATH + '/web';

	let task = new Promise( function( resolve, reject ) {
		gulp.src('').on('error', reject)
			.pipe(sync( fullsrc, pages.remote, {
				stor:stor,
				printSummary:true,
				nodelete:false		
			})).on('error', reject).on('end', resolve)
	});

	return task.then(function(){
		gutil.log('web-sync-page 完成');
	});
});


gulp.task('web-sync-page-only', function(){
	let stor = _stor({ignore:[/^\./,/\.page$/,/\.json$/]});
	let pages = _stor_pages();
	let fullsrc = BUILD_PATH + '/web';

	let task = new Promise( function( resolve, reject ) {
		gulp.src('').on('error', reject)
				.pipe(sync( fullsrc, pages.remote, {
					stor:stor,
					printSummary:true,
					nodelete:false		
				})).on('error', reject).on('end', resolve);
	});

	return task.then(function(){
		gutil.log('web-sync-page-only 完成');
	});
});



// Watch 文件变化，自动执行各种动作
gulp.task('web-watch', function() {

	// 防止多次触发更新事件 { awaitWriteFinish: true }
	return gulp.watch(__WEB_ROOT__ + '/**/**/**/**/**', { awaitWriteFinish: true }, function ( event ) {
		
		// console.log(' change:',vinyl.event , vinyl.relative,  vinyl.path );
		// console.log('File ' + event.path + ' was ' + event.type + ', running tasks...', event );
		if ( isAsset( event.path ) ){ // 更新静态文件，上传到CDN
			return gulp.start('web-sync-static');
		}

		// 更新通用模块
		if ( isCommon( event.path ) ){
			return gulp.start('web-compile');
		}


		// 更新页面
		if ( isPage( event.path ) ) {

			let ext = path.extname(event.path);
			if ( ext == '.js' ) {
				compileScript(event.path).then( function(){
					return gulp.start('web-sync-page-only');
				});
			}

			if ( ext == '.less' ) {
				compileStyle(event.path).then( function(){
					return gulp.start('web-sync-page-only');
				});
			}

			if ( ext == '.page' ) {
				mergePage(event.path).then( function(){
					compilePage( event.path ).then(function(){
						return;
					});
				});
			}

			if ( ext == '.json') {
				copyJSON(event.path).then(function(){
					compilePage( event.path ).then(function(){
						return;
					});
				})
			}
		}

	});


});

gulp.task('web', ['clean', 'web-sync-static',  'web-compile']);
gulp.task('watch',['web', 'web-watch']);


// ************************************************************************
//     小程序端编译
// ************************************************************************



// ************************************************************************
//     移动端编译
// ************************************************************************
 

