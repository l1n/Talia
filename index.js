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

bot.regex.beginsWithName = new RegExp("^[@]?"+bot.nick+"|^"+bot.fullname+"|^<@"+bot.slackid+">","i");

trustLevel = {
	'owner'     : 0,
	'admin'     : 1,
	'moderator' : 2,
	'user'      : 3,
};

authorizedUsers = {
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
        // Argument 0 is site
        'function' : function (callback, args) {
            var site = sites[args[0]];
            if (site != null)
                try {
                    request(site, sites.callback).on('error', function (e) {
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
                    'callback': function (res) {
                        $ = cheerio.html(res.body);
                        return callback($( "a[title='UMBC: An Honors University in Maryland']" )?"Main Page is up":"Main page is down (returned "+res.errorCode+")");
                    },
                },
                'webauth': {
                    'baseUrl': 'https://webauth.umbc.edu/',
                    'url': ['/umbcLogin?action=index'],
                    'callback': function (res) {
                    },
                }
            },
        },
    },
};
function myMessage(message, channel) {
    return !channel.is_channel || (message.text.match(bot.regex.beginsWithName) != null && (message.text.match(bot.rege.beginsWithName).size > 1));
}

slack = new Slack(apiToken, true, true);

slack.on("open", function() {
    console.log("Registered to slack as @"+slack.self.name+" in "+slack.team.name);
});

slack.on("message", function (message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user    = slack.getUserByID(message.user);
    if (myMessage(message, channel) && (authorizedUsers[user.name] != null) && (authorizedUsers[user.name].trustLevel <= trustLevel.user)) {
        var parse = message.text.split(' ');
        if (!channel.is_channel) parse.unshift('tali');
        parse[1] = parse[1].toLowerCase();
        if (subs[parse[1]] != null && authorizedUsers[user.name].trustLevel <= subs[parse[1]].trustLevel) {
            if (subs[parse[1]].callback) {
                subs[parse[1]]['function'](function (response) {
                    console.log(response);
                    channel.send(response);
                }, parse.slice(2));
            } else {
                channel.send(subs[parse[1]]['function'](parse.slice(2)));
            }
        }
    }
});

slack.on("error", function (error) {
    return console.error("Error: "+error);
});

slack.login();
