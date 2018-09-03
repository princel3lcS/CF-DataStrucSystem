import * as functions from 'firebase-functions'
import { app } from './constances'

const user = require('./lib/user')
const { home } = require('./lib/home')

app.get('/', home)
app.get('/getstudentDetails', user.getstudentDetails)
app.get('/verifyUserLogin', user.verifyUserLogin)
app.get('/getAllStudents', user.getAllStudents)

app.post('/setPassword', user.setPassword)
app.post('/createStudent', user.createStudent)

app.delete('/removeStudent', user.removeStudent)

exports.app = functions.https.onRequest(app)
