const fs = require('fs')
const ThemeParks = require('themeparks')
const express = require('express')
const socketio = require('socket.io')
const http = require('http')

// Constants
const DB_PATH = './db/times.json'       // json file to save to
const POLL_RATE = 1e4                   // poll rate for checking the servers

const park = new ThemeParks.Parks.DisneylandResortMagicKingdom()
const lastTimes = {}
const data = (fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}') : null) || {}

/* Server */
var app = express();
var server = http.Server(app);
var io = socketio.listen(server);
app.get('/times', (req, res) => res.send(data))
app.use(express.static('static'))
app.use(express.static('node_modules'))
io.on('connection', client => client.emit('current-times', lastTimes))

/* Theme Park Polling */
// pad a string with a character
const pad = (str, char, width) => {
    if (str.length >= width) return str

    return pad(str + char, char, width)
}

// iterative check for ride data
const pollForUpdates = () => {
    park.GetWaitTimes((err, rides) => {
        if (err) {
            console.error('ERROR', err)
            return
        }

        // see if the ride times have changed
        rides.forEach(ride => {
            // print changes
            if (lastTimes[ride.id] && lastTimes[ride.id].waitTime !== ride.waitTime) {
                console.log(`${pad(ride.name, ' ', 65)} from ${lastTimes[ride.id].waitTime} to ${ride.waitTime}min`)
            } else if (!lastTimes[ride.id]) {
                console.log(`${pad(ride.name, ' ', 65)} wait is ${ride.waitTime}min`)
            }

            // save changes to our history
            if (!lastTimes[ride.id] || lastTimes[ride.id].waitTime !== ride.waitTime) {
                const arr = data[ride.id] || []
                arr.push({
                    date:       new Date(),
                    name:       ride.name,
                    lastUpdate: ride.lastUpdate,
                    waitTime:   ride.waitTime,
                    active:     ride.active,
                    status:     ride.status,
                    fastPass:   ride.fastPass
                })

                data[ride.id] = arr
            }

            lastTimes[ride.id] = ride
        })

        io.emit('current-times', lastTimes)

        setTimeout(pollForUpdates, POLL_RATE)
    })
}

/* Application exit */
// save the history on close
const onClose = () => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data))
    process.exit()
}

//https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
// do something when app is closing
process.on('exit', onClose)

// catches ctrl+c event
process.on('SIGINT', onClose);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', onClose);
process.on('SIGUSR2', onClose);

/* Start */
pollForUpdates()
server.listen(8080, () => console.log('listening on 8080'))
