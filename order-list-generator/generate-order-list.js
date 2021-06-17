"use strict"

const fs = require("fs/promises")

const { generateRecess } = require("./order-recess")
const { generateConcentric } = require("./order-concentric")
const { generateSmacss } = require("./order-smacss")

function listRepeatedProp (data) {
  let list = data
    .map((curr) => curr[0])
    .reduce((acc, curr, idx) => {
      acc[curr] = (Object.prototype.hasOwnProperty.call(acc, curr))
        ? acc[curr] + 1
        : 1

      return acc
    }, {})


  list = Object
    .entries(list)
    .filter((curr) => curr[1] > 1)

  return list
}

function reorderStyles (data, order) {
  const indexArr = order
    .map((elem) => {
      const index = data
        .findIndex((elemInner) => elem.includes(elemInner[0]))

      return ([ index, elem ])
    })
  const startIndex = indexArr
    .map((elem) => elem[0])
    .reduce((acc, elem) => (acc === undefined || acc > elem) ? elem : acc)
  const endIndex = indexArr
    .map((elem) => elem[0])
    .reduce((acc, elem) => (acc === undefined || acc < elem) ? elem : acc)

  return ([
    ...data
      .slice(0, startIndex)
      .map((elem) => elem),
    ...indexArr
      .map((elem) => elem[0])
      .reduce((acc, elem) => [ ...acc, data[elem] ], []),
    ...data
      .slice(endIndex + 1)
      .map((elem) => elem),
  ])
}

;(async function () {
  const positionStyleOrder = [ "static", "absolute", "relative", "fixed", "sticky" ]
  const displayStyleOrder = [ "hidden", "inline", "block", "flex", "grid", "table", "contents", "flow", "list" ]
  const sizeStyleOrder = [ "container", "w", "h" ]
  const referenceClasses = [[ "dark", [ "dark" ]], [ "group", [ "group" ]], [ "peer", [ "peer" ]]]
  let data = ``

  // Recess Order
  const recess = await generateRecess()
  recess.order = reorderStyles(recess.order, positionStyleOrder)
  recess.order = reorderStyles(recess.order, displayStyleOrder)
  recess.order = reorderStyles(recess.order, sizeStyleOrder)
  recess.order = [ ...referenceClasses, ...recess.order ]
  data += `\n"recess": ${ JSON.stringify(recess.order) },`
  console.log("Recess - Repeated Properties:\n", listRepeatedProp(recess.order))

  // Concentric Order
  const concentric = await generateConcentric()
  concentric.order = reorderStyles(concentric.order, positionStyleOrder)
  concentric.order = reorderStyles(concentric.order, displayStyleOrder)
  concentric.order = reorderStyles(concentric.order, sizeStyleOrder)
  concentric.order = [ ...referenceClasses, ...concentric.order ]
  data += `\n"concentric": ${ JSON.stringify(concentric.order) },`
  console.log("Concentric - Repeated Properties:\n", listRepeatedProp(concentric.order))

  // Smacss Order
  const smacss = await generateSmacss()
  smacss.order = reorderStyles(smacss.order, positionStyleOrder)
  smacss.order = reorderStyles(smacss.order, displayStyleOrder)
  smacss.order = reorderStyles(smacss.order, sizeStyleOrder)
  smacss.order = [ ...referenceClasses, ...smacss.order ]
  data += `\n"smacss": ${ JSON.stringify(smacss.order) },`
  console.log("Smacss - Repeated Properties:\n", listRepeatedProp(smacss.order))

  data = `{${ data.slice(0, -1) }\n}`

  fs.writeFile("../order_list.json", data, "utf8")
})()
