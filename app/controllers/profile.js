/*
微信企业号标签管理
*/

var express = require('express'),
    router = express.Router();
var wxent = require('wechat-enterprise');
var wxerrmsg = require('wx-errmsg');
var config = require('../../config/config');
// var redis = require('redis'),
// 	client = redis.createClient(6379, 'redis', {});
// client.on("error", function (err) {
//     console.log("Error@profile " + err);
// });

var EventProxy = require('eventproxy');
    

var wxcfg = {
    token: config.profile.token,
    encodingAESKey: config.profile.aesKey,
    corpId: config.qyh.corpId,
    secret: config.qyh.secret,
    agentId: config.profile.agentId
};





/*
 微信事件消息处理程序。
    - 返回 function(msg, req, res, next)
        - 接收到正确消息时，返回消息处理结果；
        - 接收到不能处理的消息时，返回“正在建设中”提示
        - 出错时返回错误提示
    - 参数 eventHandlers
    {
        key: function (msg, req, res, next) {
            // 消息处理代码
        }
    }

*/
var handleEvent = function (eventHandlers) {
    return function (msg, req, res, next) {
        try {
            if (eventHandlers[msg.EventKey]) {
                eventHandlers[msg.EventKey](msg, req, res, next);
            } else {
                res.reply('正在建设中：' + msg.EventKey);
            }
        } catch(err){
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    }
};

var handleText = function (textHandlers, sessionName) {
    return function (msg, req, res, next) {
        try {
            if (req.wxsession[sessionName]) {
                textHandlers[req.wxsession[sessionName]](msg, req, res, next);
            } else {
                res.reply('正在建设中~');
            }
        } catch(err){
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    };
};

var EventHandlers = {
    
    /** 修改手机号码
     */
	'base_mobile': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            if(err || user.errcode !== 0){
                res.reply('发生错误，请将错误代码发给管理员：' + err);
            } else {
                req.wxsession.process = 'base_mobile';
                res.reply('您登记的手机号是：' + user.mobile + '。\n如需更新手机号码，请回复新手机号码。');
            }
        });  
	},

    'base_email': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            if(err || user.errcode !== 0){
                res.reply('发生错误，请将错误代码发给管理员：' + err);
            } else {
                req.wxsession.process = 'base_email';
                res.reply('您登记的邮箱是：' + user.email + '。\n如需更新，请回复新的邮箱地址。');
            }
        });  
    },

    'base_avator': function (msg, req, res, next) {
        
    },

    'person_ykt': function (msg, req, res, next) {
    },

    'person_sfz': function (msg, req, res, next) {
        
    }

};

var TextProcessHandlers = {
    'base_mobile': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.updateUser({ userid: msg.FromUserName, mobile: msg.Content }, function (err, user) {
            if(err){
                if (user && user.errcode !== 0) {
                    res.reply('更新失败：' + wxerrmsg[user.errcode]);
                } else
                    res.reply('发生错误:' + err);
            } else {
                delete req.wxsession.process;
                res.reply('更新成功');
            }
        });  
    },

    'person_ykt': function (msg, req, res, next) {
    }
};



module.exports = function (app, cfg) {
    // app.use(express.query());
    app.use('/profile', router);

    router.use('/', wxent(wxcfg, wxent.event(handleEvent(EventHandlers)).text(handleText(TextProcessHandlers, 'process'))));
};