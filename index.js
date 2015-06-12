var http = require('http');
var https = require('https');
var cheerio = require('cheerio');
var Slack = require('slack-client');
apiToken = require('api.json').slack;

bot = {
	'nick': 'talia',
    'slackid': 'U06953J6B',
	'fullname': 'Talia Praesul',
	'regex': {},
};

bot.regex.beginsWithName = new RegExp("/^[@]?"+bot.nick+"|^"+bot.fullname+"|^<@"+bot.slackid+">/i");

trustLevel = {
	'owner'     : 0,
	'admin'     : 1,
	'moderator' : 2,
	'user'      : 3,
};

authorizedUsers = {
	'lin' : {
		'trustLevel' : trustLevel.owner,
	},
	'kfh' : {
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
            var httpSites = {
                'www': {
                    'host': 'www.umbc.edu',
                    'port': 80,
                    'path': '/',
                }
            };
            var httpsSites = {
                'webauth': {
                    'host': 'webauth.umbc.edu',
                    'port': 443,
                    'path': '/umbcLogin?action=index',
                }
            };
            if (httpSites[args[0]] != null && https
            try {
                http.get(sites[args[0]],
                        function (res) {
                            res.body = '';
                            res.on('data', function (data) {
                                res.body += data;
                            });
                            res.on('end', function () {
                                try {
                                    res.json = JSON.parse(res.body);
                                } catch (e) {
                                    res.parseError = e;
                                    // return callback("Error: "+e);
                                }
                                $ = cheerio.html(res.body);
                                return callback(args[0]+" returned "+$('body').text());
                            });
                        }).on('error', function (e) {
                    return callback(e);
                });
            } catch (e) {
                return callback('Error: '+e);
            }
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
