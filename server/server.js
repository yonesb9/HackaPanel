const time = require('./model/time');
const Team = require('./model/Team');

class Server {

    constructor () {
        this._io = null;
    }

    set io (io) {
        this._io = io;
        this.init();
    }

    get io () {
        return this._io;
    }

    init () {
        const io = this.io;
        io.on('connection', onUserConnected);
        setInterval(() => { io.emit('time sync', time) }, 60 * 1000);
        setInterval(() => this.updateTeamScore('pug', Math.floor(Math.random() * 3000) + 5000), 3000)
    }

    updateTeamScore (teamUserName, score) {
        Team.findOneAndUpdate({ username: teamUserName }, { score: score }, (err) => {
            if (err) return console.error(`Could not update ${teamUserName}'s score to ${score}`);
            this.io.emit('team score update', { username: teamUserName,  score: score })
        });
    }

    static resetAllConnections () {
        Team.update({}, { socketId: '' }, { multi: true }, function () {})
    }

    get (url) {}

    login (form, socket) {

        if (!!this.io) Team.findOne({ username: form.username, password: form.password }, (err, team) => {

            // Send error message if user doesn't exist
            if (!team) return socket.emit('user login error', 'Ops! re-check your username or password;)');

            // Check if last saved socket id is still alive
            if (team.socketId !== '' && !!this.io.sockets.sockets[team.socketId]) {
                return socket.emit('user login error', 'You are logged in another device! check it again');
            }

            // if Username and Password was OK
            socket.emit('user info', {
                username: team.username,
                name: team.name,
                score: team.score,
            });
            team.socketId = socket.id;
            team.save();
        })
    }

    logout (socket) {
        Team.findOneAndUpdate({ socketId: socket.id }, { socketId: '' }, function () {})
    }
}

const onUserConnected = socket => {
    socket.emit('time sync', time);
    socket.on('user login', form => server.login(form, socket));
    socket.on('user logout', () => server.logout(socket));
    socket.on('disconnect', () => server.logout(socket));
};

Server.resetAllConnections();
const server = new Server;

module.exports = server;