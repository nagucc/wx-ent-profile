var moment = require('moment');
var redis = require('redis');


/**
 * @param options
 * 指定参数。
        - host redis服务器地址
        - port redis端口
        - appId 要保存的token的appId
        - expire 过期时间(秒)，默认为7000
 */
var At = function (host, port, appId, expire) {
    this.host = host;
    this.port = port;
    this.appId = appId;
    this.expire = expire;

    // var client = redis.createClient(this.port, this.host, {});
    // client.on("error", function (err) {
    //     console.log("Error@at " + err);
    // });

    var client = redis.createClient(6379, 'redis', {});
    client.on("error", function (err) {
        console.log("Error@profile " + err);
    });

    this.client = client;
};


// 获取指定的AccessToken

At.prototype.getToken = function (callback) {
    var self = this;
    self.client.get(self.appId +'.expire', function(err, date){
        if(err) callback(err);
        else if(!date) callback('token is out of date', null);            
        else if(moment().isBefore(moment(date))) {                               // 还在有效期内
            console.log('date: ' + date);
            self.client.get(self.appId + '.token', function(err, token){
                if(err || !token) callback(err);
                else {
                    console.log('token:' + JSON.stringify());
                    callback(err, token);
                }
            });
        } else callback('no access token');
    });
};

At.prototype.saveToken = function (token, callback) {
    var self = this;
    self.expire = self.expire || 7000;
    console.log('token will save: ' + token)
    self.client.set(self.appId + '.token', token);
    self.client.set(self.appId + '.expire', moment().add(self.expire, 's'));
    callback(null, JSON.stringify(token));
}

module.exports = At;