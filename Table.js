function Table(id, maxPlayers) {
	this.id = id;
	this.maxPlayers = maxPlayers ? maxPlayers : 9;
	this.playerCount = 0;
	this.players = [];
	while (maxPlayers--)
		this.players.push(null);
	this.game = null;
}

Table.prototype.findPlayerById = function(playerId) {
    for (var i = 0; i < this.maxPlayers; i++) {
        if (this.players[i] && this.players[i].socket.id == playerId)
            return this.players[i];
    }
    return null;
}

Table.prototype.findPlayerByName = function(playerName) {
    for (var i = 0; i < this.maxPlayers; i++) {
        if (this.players[i] && this.players[i].name == playerName)
            return this.players[i];
    }
    return null;
}

Table.prototype.addPlayer = function(seat, player) {
    if (this.findPlayerById(player.socket.id) || this.findPlayerByName(player.name))
        return false;
    if (this.game && this.game.running)
        return false;
    if (seat >= 0 && seat < this.maxPlayers) {
        if (this.players[seat] != null)
            return false;
        player.seat = seat;
        player.table = this.id;
        this.players[seat] = player;
        this.playerCount++;
        this.resetReady();
        return true;
    }
    return false;
};

Table.prototype.removePlayer = function(seat) {
    if (seat >= 0 && seat < this.maxPlayers && this.players[seat] != null) {
        delete this.players[seat];
        this.playerCount--;
        this.resetReady();
        return true;
    }
    return false;
}

Table.prototype.playersReady = function() {
    if (this.playerCount < 2)
        return false;
    for (var i = 0; i < this.maxPlayers; i++)
        if (this.players[i] && !this.players[i].ready)
            return false;
    return true;
}

Table.prototype.playersConnected = function() {
    if (this.playerCount < 2)
        return false;
    for (var i = 0; i < this.maxPlayers; i++)
        if (this.players[i] && !this.players[i].connected)
            return false;
    return true;
}

Table.prototype.kickDisconnected = function() {
    for (var i = 0; i < this.maxPlayers; i++)
        if (this.players[i] && !this.players[i].connected) {
            delete this.players[i];
            this.playerCount--;
        }
}

Table.prototype.resetReady = function() {
    for (var i = 0; i < this.maxPlayers; i++)
        if (this.players[i])
            this.players[i].ready = false;
}

Table.prototype.getPlayerNames = function(disconnected) {
    var result = [];
    for (var i = 0; i < this.maxPlayers; i++) {
        if (this.players[i] && (disconnected || this.players[i].connected))
            result.push(this.players[i].name);
        else
            result.push(null);
    }
    return result;
}

Table.prototype.getPlayers = function() {
    var result = [];
    for (var i = 0; i < this.maxPlayers; i++) {
        if (this.players[i])
            result.push({'name': this.players[i].name});
        else
            result.push(null);
    }
    return result;
}

module.exports = Table;
