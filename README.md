# Texas holdem

This is a texas holdem game built with express.js and socket.io.
It allows you to host a single table Sit and Go tournament (2-9 players).

## Installing

Install the game server using [npm](https://www.npmjs.com/):

```
npm install
```

Run server with:

```
npm start
```

## Options

You can add different blind structures for tournaments in [structures.json](structures.json) file.
The structure entry has the following format:

```json
"my-structure-name": {
	"startingStack": 1500,
	"blindsUp": 10,
	"blinds": [
		[25, 50, 5],
		[40, 80, 8],
		[75, 150, 15],
		[125, 250, 30],
		[200, 400, 50],
		[400, 800, 100],
		[750, 1500, 200],
		[1250, 2500, 350],
		[2000, 4000, 600]
	]
}
```

In the above example every player starts with 1500 chips and blinds go up every 10 hands.
Arrays in ```"blinds"``` describe blind levels with antes.
In this case the first level is 25/50 ante 5.

You can apply your structure to the next tournament by adding its name to [config.json](config.json) file.

```json
"blind-structure": "my-structure-name",
```

You have to restart the game server for the changes to take effect.
