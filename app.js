/**
 * 服务入口
 */
var http = require('http');
var koaStatic = require('koa-static');
var path = require('path');
var koaBody = require('koa-body');
var bodyParser = require('koa-bodyparser');
var fs = require('fs');
var Koa = require('koa2');
const views = require('koa-views');
const Router = require('koa-router');
const router = new Router();
const customData = require('./data/home.js');

var app = new Koa();
var port = process.env.PORT || '8100';

var uploadHost = `http://localhost:${port}/uploads/`;

app.use(bodyParser());
app.use(koaBody({
    formidable: {
        //设置文件的默认保存目录，不设置则保存在系统临时目录下  
        uploadDir: path.resolve(__dirname, './static/uploads')
    },
    multipart: true // 支持文件上传
}));

app.use(koaStatic(
    path.resolve(__dirname, './static')
));

//加载模板
app.use(views(path.resolve(__dirname, './views'), {
    extension: 'ejs'
}));

//允许跨域
app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', ctx.headers.origin);
    //ctx.set('Access-Control-Allow-Origin', ctx.headers.origin);
    ctx.set("Access-Control-Max-Age", 864000);
    // 设置所允许的HTTP请求方法
    ctx.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    // 字段是必需的。它也是一个逗号分隔的字符串，表明服务器支持的所有头信息字段.
    ctx.set("Access-Control-Allow-Headers", "x-requested-with, accept, origin, content-type");

    await next();
});
//////////////////////////////////////////////////////////////////
//首页主要数据
router.post('/home', (ctx, next)=> {
    console.log('获取首页数据');
    var data = {
        "status": 1, 
        "msg": "success", 
        "data": {
            "swiperList": customData.swiperList,
            "topNavigatorList": customData.topNavigatorList,
            "adBannerImage": customData.adBannerImage,
            "leaderPhone": customData.leaderPhone,
            "recommendList": customData.recommendList,
            "floorList": customData.floorList,
            "hotGoodsTitle": customData.hotGoodsTitle,
           // "hotGoodsList": customData.hotGoodsList.slice(0, 6)
        }
    };
    ctx.body = JSON.stringify(data);
});
//首页劲爆商品数据
router.post('/hotGoods', (ctx, next) => {
    var { page } = ctx.request.body; 
    console.log('首页劲爆商品数据: ', page);
    if(!page){
        page = 0;
    }
    var data = {
        "status": 1, 
        "msg": "success", 
        "data": customData.hotGoodsList.slice(page*6, (page * 6)+6)
    };
    ctx.body = JSON.stringify(data);
});
//分类数据
router.post('/category', async(ctx, next) => {
    console.log('获取分类数据');
    var res = await readFile('./data/category.json');
    ctx.body = res;
});
//分类列表
router.post('/categoryGoodList', async (ctx, next) => {
    const { mallCategoryId, mallSubId, page} = ctx.request.body;
    console.log('获取分类商品列表数据:', mallCategoryId, mallSubId, page);
    
    if (mallCategoryId == '1' && mallSubId == ''){//大类啤酒
        var res = await readFile('./data/category_good_list.json');
        var resJson = JSON.parse(res);
        resJson.data = resJson.data.slice((page - 1) * 6, ((page - 1) * 6) + 6);
        ctx.body = JSON.stringify(resJson);
    } else {
        ctx.body = JSON.stringify({
            "status": 1,
            "msg": "success", 
            "data": []
        });
    }
});
//商品详情
router.post('/detailGoods', async(ctx, next)=> {
    
    var { goodsId } = ctx.request.body;
    console.log('获取详情数据:', goodsId);
    var res = await readFile('./data/detail.json');
    ctx.body = res;
});
//文件读取
function readFile(url) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, url,), (err, res) => {
            if (err) {
                console.log('读取文件失败');
                reject(err);
            } else {
                resolve(res.toString());
            }
        });
    });
}

router.get('/', async function (ctx, next) {
    let title = 'liyongfen';
    await ctx.render('index', {
        title
    });
});

router.get('/testGet', (ctx, next) => {
    var { name } = ctx.query;
    console.log(name);
    ctx.body = `{"status": 1, "msg": "success", "data": {"name": "${name}xxxxx"}}`;
});

////////////////////////////////////////////////////////////////////////////
app.use(router.routes()).use(router.allowedMethods());
/**
 * Create HTTP server.
 */
var server = http.createServer(app.callback());
server.listen(port);
console.log('flutter_show server start ......   ');