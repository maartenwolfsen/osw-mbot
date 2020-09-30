const Discord = require("discord.js");
const { prefix, token, yt_max_results, yt_api_token } = require("./config.json");
const ytdl = require("ytdl-core");
const ytsearch = require("youtube-search");

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
    console.log("Ready");
});

client.once("reconnecting", () => {
    console.log("Reconnecting...");
});

client.once("disconnect", () => {
    console.log("Disconnect");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else {
        message.channel.send("WaT hEb Je?!");
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Je moet wel in een voice channel zitten amigo!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "Mag ik de correcte rechten plz?"
        );
    }

    const track = args[1];

    if (track.substr(0, 4) !== 'http') {
        let str = "";

        for (var i = 1; i < args.length; i++) {
            str += args[i];

            if (i !== args.length - 1) str += " ";
        }

        ytsearch(str, {maxResults: yt_max_results, key: yt_api_token}, function(err, results) {
            if (err) return console.dir(err.data);

            var objResults = JSON.parse(results);
            console.log(objResults);
            console.log(objResults.link);

            return message.channel.send(
                "Alleen trefwoorden: " + results[0].link
            );
        });
    }

    const songInfo = await ytdl.getInfo(args[1]);


    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} wordt afgespeeld!`);
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Je moet wel in een voice channel zitten amigo!"
        );
    if (!serverQueue)
        return message.channel.send("Ik kan toch niks skippen klootviool!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Je moet wel in een voice channel zitten amigo!"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`"${song.title}" wordt afgespeeld!`);
}

client.login(token);
