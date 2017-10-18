const fs = require('fs')
const ThemeParks = require('themeparks')

const DB_PATH = './db/times.json'
const POLL_RATE = 1e4

const park = new ThemeParks.Parks.DisneylandResortMagicKingdom()
const lastTimes = {}

const pad = (str, char, width) => {
    if (str.length >= width) return str

    return pad(str + char, char, width)
}

const _do = () => {
    park.GetWaitTimes(function(err, rides) {
        rides.forEach(ride => {
            if (lastTimes[ride.id] && lastTimes[ride.id].waitTime !== ride.waitTime) {
                console.log(`${pad(ride.name, ' ', 65)} from ${lastTimes[ride.id].waitTime} to ${ride.waitTime}min`)
            } else if (!lastTimes[ride.id]) {
                console.log(`${pad(ride.name, ' ', 65)} wait is ${ride.waitTime}min`)
            }

            lastTimes[ride.id] = ride
        })

        setTimeout(_do, POLL_RATE)
    })
}

_do()