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

var util = require('util');


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

var user_attrs_global;

var EventHandlers = {

    post_process:function (err,user,res,req,menu_key,key,name){
        if(err || user.errcode !== 0){
            res.reply('发生错误，请将错误代码发给管理员：' + err);
        } else {
            req.wxsession.process = menu_key;
            if(user[key]) {
                res.reply(util.format('您登记的%s是：%s。\n如需更新%s，请回复新%s。', name, user[key], name, name));
            }
            else {
                res.reply(util.format('您还没登记%s，请回复%s。',name, name));
            }
        }
    },

    post_process_attr:function (err,user,res,req,menu_key,key,name){
        if(err || user.errcode !== 0){
            res.reply('发生错误，请将错误代码发给管理员：' + err);
        } else {
            req.wxsession.process = menu_key;
            var user_attrs = user.extattr.attrs;
            user_attrs_global = user_attrs;
            var attr_value;
            for(index in user_attrs) {
                if(user_attrs[index].name==name) {
                    attr_value = user_attrs[index].value;
                }
            }
            if(attr_value) {
                res.reply(util.format('您登记的%s是：%s。\n如需更新%s，请回复新%s。', name, attr_value, name, name));
            }
            else {
                res.reply(util.format('您还没登记%s，请回复%s。',name, name));
            }
        }
    },

    /**
     * 获取头像
     */
    'base_avator': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            console.info(JSON.stringify(user, null, 4));
        });
    },

    /**
     * 获取手机号码
     */
    'base_mobile': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            EventHandlers.post_process(err, user, res, req, 'base_mobile', 'mobile', '手机号码');
        });
	},

    /**
     * 获取电子邮件
     */
    'base_email': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            EventHandlers.post_process(err, user, res, req, 'base_email', 'email', '电子邮件');
        });
    },

    /**
     * 获取民族
     */
    'person_mz': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            EventHandlers.post_process_attr(err, user, res, req, 'person_mz', '民族', '民族');
        });
    },

    /**
     * 获取身份证号
     */
    'person_sfz': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            EventHandlers.post_process_attr(err, user, res, req, 'person_sfz', '身份证号', '身份证号');
        });
    },

    /**
     * 获取出生日期
     */
    'person_csrq': function (msg, req, res, next) {
        var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            EventHandlers.post_process_attr(err, user, res, req, 'person_csrq', '出生日期', '出生日期');
        });
    }

};

var TextProcessHandlers = {

    post_process: function (err, user, res, req) {
        if (err) {
            if (user && user.errcode !== 0) {
                res.reply('更新失败：' + wxerrmsg[user.errcode]);
            } else
                res.reply('发生错误:' + err);
        } else {
            delete req.wxsession.process;
            res.reply('更新成功');
        }
    },

    update_attr: function (attr_name, attr_value) {
        var is_attr_exist = false;
        //console.info(JSON.stringify(util.inspect(user_attrs_global, null, 4)));
        for(index in user_attrs_global) {
            if(user_attrs_global[index].name==attr_name) {
                user_attrs_global[index].value = attr_value;
                is_attr_exist = true;
            }
        }
        if(!is_attr_exist) {
            user_attrs_global.push({name: attr_name, value: attr_value});
        }
    },

    check_date: function (attr_value) {
        var is_validate = false;
        var reg = /^\d{6}$/;
        if (reg.test(attr_value)) {
            is_validate = true;
        }
        return is_validate;
    },

    // http://www.jb51.net/article/15444.htm
    is_id_card_no: function(num,res) {
        var factorArr = new Array(7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2,1);
        var error;
        var varArray = new Array();
        var intValue;
        var lngProduct = 0;
        var intCheckDigit;
        var intStrLen = num.length;
        var idNumber = num;
        var is_validate = true;
        var error_msg;
        // initialize
        if ((intStrLen != 15) && (intStrLen != 18)) {
            return '输入身份证号码长度不对！';
        }
        // check and set value
        for(i=0;i<intStrLen;i++) {
            varArray[i] = idNumber.charAt(i);
            if ((varArray[i] < '0' || varArray[i] > '9') && (i != 17)) {
                return '错误的身份证号码！';
            } else if (i < 17) {
                varArray[i] = varArray[i]*factorArr[i];
            }
        }
        //length is 18
        if (intStrLen == 18) {
            //check date
            var date8 = idNumber.substring(6,14);
            if (TextProcessHandlers.check_date(date8) == false) {
                error_msg = '身份证中日期信息不正确！';
            }
            // calculate the sum of the products
            for(i=0;i<17;i++) {
                lngProduct = lngProduct + varArray[i];
            }
            // calculate the check digit
            intCheckDigit = 12 - lngProduct % 11;
            switch (intCheckDigit) {
                case 10:
                    intCheckDigit = 'X';
                    break;
                case 11:
                    intCheckDigit = 0;
                    break;
                case 12:
                    intCheckDigit = 1;
                    break;
            }
            // check last digit
            if (varArray[17].toUpperCase() != intCheckDigit) {
                error_msg = '身份证效验位错误!...正确为： ';
            }
        }
        //length is 15
        else{
            //check date
            var date6 = idNumber.substring(6,12);
            if (TextProcessHandlers.check_date(date6) == false) {
                error_msg = '身份证中日期信息不正确！';
            }
        }
        return error_msg;
    },

    validate_attr_value: function(res, req, attr_name, attr_value) {
        var is_validate = true;
        switch (attr_name) {
            case 'base_mobile':
                var reg = /^0?1[3|4|5|8][0-9]\d{8}$/;
                if (!reg.test(attr_value)) {
                    is_validate = false;
                    res.reply('手机号码格式有误（正确格式是11位数字）');
                }
                break;
            case 'base_email':
                var reg = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;
                if(!reg.test(attr_value)){
                    is_validate = false;
                    res.reply('电子邮箱格式有误（正确格式如 xiaoming@sina.com.cn）');
                }
                break;
            case 'person_mz':
                break;
            case 'person_sfz':
                var error_msg = TextProcessHandlers.is_id_card_no(attr_value, res);
                if(error_msg) {
                    is_validate = false;
                    res.reply(error_msg);
                }
                break;
            case 'person_csrq':
                if(!TextProcessHandlers.check_date(attr_value)) {
                    is_validate = false;
                    res.reply('出生日期格式有误（正确格式类似于20110101）');
                }
                break;
        }
        return is_validate;
    },

    /**
     * 修改头像
     */
    'base_avator': function (msg, req, res, next) {

    },

    /**
     * 修改手机号
     */
    'base_mobile': function (msg, req, res, next) {
        var is_validate = TextProcessHandlers.validate_attr_value(res, req, 'base_mobile', msg.Content);
        if(is_validate) {
            var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
            wxapi.updateUser({ userid: msg.FromUserName, mobile: msg.Content }, function (err, user) {
                TextProcessHandlers.post_process(err, user, res, req);
            });
        }
    },

    /**
     * 修改电子邮件
     */
    'base_email': function (msg, req, res, next) {
        var is_validate = TextProcessHandlers.validate_attr_value(res, req, 'base_email', msg.Content);
        if(is_validate) {
            var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
            wxapi.updateUser({ userid: msg.FromUserName, email: msg.Content }, function (err, user) {
                TextProcessHandlers.post_process(err, user, res, req);
            });
        }
    },

    /**
     * 修改民族
     */
    'person_mz': function (msg, req, res, next) {
        var is_validate = TextProcessHandlers.validate_attr_value(res, req, 'person_mz', msg.Content);
        if(is_validate) {
            TextProcessHandlers.update_attr('民族', msg.Content);
            var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
            wxapi.updateUser({ userid: msg.FromUserName, extattr: {attrs : user_attrs_global} }, function (err, user) {
                TextProcessHandlers.post_process(err, user, res, req);
            });
        }
    },

    /**
     * 修改身份证号
     */
    'person_sfz': function (msg, req, res, next) {
        var is_validate = TextProcessHandlers.validate_attr_value(res, req, 'person_sfz', msg.Content);
        if(is_validate) {
            TextProcessHandlers.update_attr('身份证号', msg.Content);
            var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
            wxapi.updateUser({ userid: msg.FromUserName, extattr: {attrs : user_attrs_global} }, function (err, user) {
                TextProcessHandlers.post_process(err, user, res, req);
            });
        }
    },

    /**
     * 修改出生日期
     */
    'person_csrq': function (msg, req, res, next) {
        var is_validate = TextProcessHandlers.validate_attr_value(res, req, 'person_csrq', msg.Content);
        if(is_validate) {
            TextProcessHandlers.update_attr('出生日期', msg.Content);
            var wxapi = require('../models/wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
            wxapi.updateUser({ userid: msg.FromUserName, extattr: {attrs : user_attrs_global} }, function (err, user) {
                TextProcessHandlers.post_process(err, user, res, req);
            });
        }
    }
};



module.exports = function (app, cfg) {
    // app.use(express.query());
    app.use('/', router);
    router.use('/', wxent(wxcfg, wxent.event(handleEvent(EventHandlers)).text(handleText(TextProcessHandlers, 'process'))));
};
