import * as functions from "firebase-functions"
const admin = require('firebase-admin')
var moment = require('moment')
admin.initializeApp({
    credential: admin.credential.applicationDefault() 
})
const state = {
  GEN_CODE: 'GEN_CODE',
  FIND_CODE: 'FIND_CODE',
  USE_CODE: 'USE_CODE'
}
const db = admin.firestore()

export let getDiscount = functions.https.onRequest(async (req, res) => {
  let promoCode = req.query.promoCode
  let c = await db.collection('promoCode').doc(promoCode).get()
  if (c.exists) {
      let data = c.data()
      setLog (req.query, state.FIND_CODE, c.data())
      res.send({
        ...data,
        promoCode: promoCode})
  } else {
      setLog (req.query, state.FIND_CODE, null)
      res.send(null)
  }
})

export let checkOut = functions.https.onRequest(async (req, res) => {
  let {tel, net, promoCode} = req.query
  if (promoCode) {
    const promoRef = db.collection('promoCode').doc(promoCode)
    const c = db.runTransaction(t => {
      return t.get(promoRef)
    })
    if (c.exists && c.data().status === 'unused') {
      if (c.data().type === 'onetime') {
        await db.collection('promoCode').doc(promoCode).update({
          status: 'used'
        })
      }
      if (c.data().discount_type === 'Baht') {
        net = net - (c.data().discount_number)
        setLog (req.query, state.USE_CODE, net)
      } else if (c.data().discount_type === '%') {
        net = net - ((net * c.data().discount_number) / 100)
        setLog (req.query, state.USE_CODE, net)
      }
    } else {
      setLog (req.query, state.USE_CODE, null)
    }
  }

  const result = await db.collection('vip').doc(tel).get()
  if (result.exists && net >= 3000) {
    let generatedCode = genCode()
    let now = moment().format()
    let date = moment.parseZone(now).utc().format()
    let expDate = new Date()
    let newCode = {
      create_date: date,
      discount_number: 300,
      discount_type: 'Baht',
      exp_date: expDate,
      status: 'unused',
      type: 'onetime'
    }
    await db.collection('promoCode').doc(generatedCode).set(newCode)
    setLog (req.query, state.GEN_CODE, {Code : generatedCode, Net : net})
    res.send({ Code : generatedCode, Net : net})
  } else {
    setLog (req.query, state.GEN_CODE, {Net : net})
    res.send({Net: net})
  }
})

function genCode() {
  while (true) {
    var code = ''
    var message = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    for (var i = 0; i < 5; i++) {
      code += message.charAt(Math.floor(Math.random() * message.length))
    }
    const transaction = db.runTransaction(t => {
      return t.get(db.collection('promoCode').doc(code))
    })
    if (!transaction.exists) {
      break
    }
    // TODO : DB Transaction
  }
  return code
}

function setLog (raw, state, result) {
  db.collection('logs').add({
      time: new Date(),
      state: state,
      result: result,
      raw: raw
  })
}

// const message = () => {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve(`from Babelified Cloud Functions!`)
//     }, 1000)
//   })
// }

// export let helloWorld = functions.https.onRequest(async (req, res) => {
//   let world = await message()
//   res.status(200).send(`Hello ${world}`)
// })
