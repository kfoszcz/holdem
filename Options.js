Options = {
	'heads-up-turbo': {
		startingStack: 1500,
		blindsUp: 10,
		blinds: [
			[10, 20, 0],
			[15, 30, 0],
			[20, 40, 0],
			[30, 60, 0],
			[40, 80, 0],
			[50, 100, 0],
			[60, 120, 0],
			[75, 150, 0],
			[100, 200, 0],
			[125, 250, 0],
			[150, 300, 0],
			[200, 400, 0],
			[250, 500, 0],
			[300, 600, 0],
			[350, 700, 0],
			[400, 800, 0],
			[500, 1000, 0]
		]
	},
	'heads-up-normal': {
		startingStack: 1500,
		blindsUp: 20,
		blinds: [
			[10, 20, 0],
			[15, 30, 0],
			[20, 40, 0],
			[30, 60, 0],
			[40, 80, 0],
			[50, 100, 0],
			[60, 120, 0],
			[75, 150, 0],
			[100, 200, 0],
			[125, 250, 0],
			[150, 300, 0],
			[200, 400, 0],
			[250, 500, 0],
			[300, 600, 0],
			[350, 700, 0],
			[400, 800, 0],
			[500, 1000, 0]
		]
	},
	'tourney-turbo': {
		startingStack: 3000,
		blindsUp: 10,
		blinds: [
			[10, 20, 2],
			[15, 30, 3],
			[20, 40, 4],
			[25, 50, 5],
			[30, 60, 6],
			[40, 80, 8],
			[50, 100, 10],
			[60, 120, 15],
			[80, 160, 20],
			[100, 200, 25],
			[125, 250, 30],
			[150, 300, 40],
			[175, 350, 50],
			[200, 400, 60],
			[250, 500, 80],
			[300, 600, 100],
			[350, 700, 120],
			[400, 800, 160],
			[500, 1000, 200],
			[600, 1200, 240],
			[700, 1400, 280],
			[800, 1600, 320],
			[1000, 2000, 400],
			[1200, 2400, 500],
			[1400, 2800, 600],
			[1600, 3200, 700],
			[1800, 3600, 800],
			[2000, 4000, 900],
			[2400, 4800, 1100],
			[2800, 5600, 1300],
			[3200, 6400, 1500],
			[3600, 7200, 1700],
			[4000, 8000, 1900],
			[5000, 10000, 2500],
			[6000, 12000, 3000],
			[7000, 14000, 3500],
			[8000, 16000, 4000]
		]
	},
	'tourney-deep-normal': {
		startingStack: 5000,
		blindsUp: 20,
		blinds: [
			[15, 30, 4],
			[20, 40, 5],
			[25, 50, 6],
			[30, 60, 8],
			[40, 80, 9],
			[50, 100, 10],
			[60, 120, 12],
			[75, 150, 15],
			[100, 200, 18],
			[125, 250, 20],
			[150, 300, 22],
			[200, 400, 25],
			[250, 500, 30],
			[300, 600, 40],
			[350, 700, 50],
			[400, 800, 65],
			[500, 1000, 75],
			[600, 1200, 90],
			[700, 1400, 100],
			[800, 1600, 125],
			[900, 1800, 150]
			[1000, 2000, 175],
			[1250, 2500, 200],
			[1500, 3000, 225],
			[1750, 3500, 250]
			[2000, 4000, 315],
			[2500, 5000, 375],
			[3000, 6000, 500],
			[3500, 7000, 625],
			[4000, 8000, 750],
			[5000, 10000, 875],
			[6000, 12000, 1000],
			[7000, 14000, 1250],
			[8000, 16000, 1500],
			[9000, 18000, 1750],
			[10000, 20000, 2000]
		]
	},
	'tourney-hyper': {
		startingStack: 2000,
		blindsUp: 7,
		blinds: [
			[10, 20, 2],
			[15, 30, 3],
			[20, 40, 4],
			[30, 60, 6],
			[40, 80, 10],
			[50, 100, 15],
			[60, 120, 20],
			[75, 150, 25],
			[100, 200, 40],
			[125, 250, 50],
			[150, 300, 60],
			[200, 400, 100],
			[250, 500, 125],
			[300, 600, 150],
			[350, 700, 200],
			[400, 800, 300],
			[500, 1000, 400],
			[600, 1200, 500],
			[750, 1500, 600],
			[900, 1800, 750],
			[1200, 2400, 900],
			[1500, 3000, 1200],
		]
	},
	'allin-shootout': {
		startingStack: 100,
		blindsUp: 3,
		blinds: [
			[1000, 2000, 500],
			[1500, 3000, 1000],
			[2000, 4000, 1500]
		]
	}
}

module.exports = Options;