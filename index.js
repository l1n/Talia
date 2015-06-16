var http = require('http');
var request = require('request');
var cheerio = require('cheerio');
var Slack = require('slack-client');
var apiToken;
try {
    apiToken = require('./api.json').slack;
} catch (e) {
    apiToken = require('../data/api.json').slack;
};

bot = {
    'nick': 'talia',
    'slackid': 'U06953J6B',
    'fullname': 'Talia Praesul',
    'regex': {},
};

bot.regex.beginsWithName = new RegExp("^(?:[@]?"+bot.nick+"|^"+bot.fullname+"|^<@"+bot.slackid+">)(.*?)$","i");

trustLevel = {
    'owner'     : 0,
    'admin'     : 1,
    'moderator' : 2,
    'user'      : 3,
};

users = {
    'sda1' : {
        'trustLevel' : trustLevel.owner,
    },
    'kherna1' : {
        'trustLevel' : trustLevel.admin,
    },
    'gballan1' : {
        'trustLevel' : trustLevel.admin,
    },
    'erude' : {
        'trustLevel' : trustLevel.user,
    },
};

subs = {
    'status' : {
        'trustLevel' : trustLevel.user,
        'callback' : true,
        // Argument 0 is sub
        // Argument 1 is site
        'function' : function (callback, args) {
            var site = args[0].data.sites[args[1]];
            if (site != null)
                try {
                    request(site, site.callback).on('error', function (e) {
                        return callback('Error streaming request: '+e);
                    });
                } catch (e) {
                    return callback('Unexpected error streaming request: '+e);
                }
        },
        'data': {
            'sites': {
                'www': {
                    'baseUrl': 'https://www.umbc.edu/',
                    'url': ['/'],
                    'callback': function (error, response, body) {
                        $ = cheerio.html(body);
                        return callback($( "a[title='UMBC: An Honors University in Maryland']" )?"Main Page is up":"Main page is down (returned "+error+")");
                    },
                },
                'webauth': {
                    'baseUrl': 'https://webauth.umbc.edu/',
                    'url': ['/umbcLogin?action=index'],
                    'callback': function (error, response, body) {
                        $ = cheerio.html(body);
                        return callback($( "a[title='UMBC: An Honors University in Maryland']" )?"Main Page is up":"Main page is down (returned "+error+")");
                    },
                }
            },
        },
    },
};
function myMessage(message, channel) {
    return !channel.is_channel || (message.text.match(bot.regex.beginsWithName) != null && (message.text.match(bot.regex.beginsWithName).size > 1));
}

slack = new Slack(apiToken, true, true);
http  = http.createServer(function (request, response) {
});

slack.on("open", function() {
    console.log("Registered to slack as @"+slack.self.name+" in "+slack.team.name);
});

slack.on("message", function (message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user    = slack.getUserByID(message.user);
    if (myMessage(message, channel) && (users[user.name] != null) && (users[user.name].trustLevel <= trustLevel.user)) {
        var parse;
        try {
            parse = message.text.match(bot.regex.beginsWithName)[1].split(' ');
        } catch (e) {
            parse = message.text.split(' ');
        }
        console.log(parse);
        var sub = subs[parse[0]];
        if (sub != null && users[user.name].trustLevel <= sub.trustLevel) {
            parse.shift();
            parse.unshift(sub);
            if (sub.callback) {
                sub['function'](function (response) {
                    console.log(response);
                    channel.send(response);
                }, parse);
            } else {
                channel.send(sub['function'](parse));
            }
        }
    }
});

slack.on("error", function (error) {
    return console.error("Error: "+error);
});

http.listen(OPENSHIFT_NODEJS_IP, OPENSHIFT_NODEJS_PORT);
slack.login();
