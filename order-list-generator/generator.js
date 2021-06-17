"use strict"

const { promisify } = require("util")
const exec = promisify(require("child_process").exec)
const fs = require("fs/promises")

const tailwindConfig = require("./tailwind.config")
const tailwindColours = require("tailwindcss/colors")

function sorting (a, b) {
  const maxLen = (a.length < b.length)
    ? a.length
    : b.length
  let sort = 0
  let count = 0

  while (count < maxLen) {
    if (a[count] !== b[count]) {
      if (Number.isNaN(Number(a[count])) && !Number.isNaN(Number(b[count]))) {
        sort = -1
      }
      else if (!Number.isNaN(Number(a[count])) && Number.isNaN(Number(b[count]))) {
        sort = 1
      }
      else {
        sort = (a[count] < b[count])
          ? -1
          : 1
      }

      break
    }

    count++
  }

  return sort
}

async function generator ({ config, order }) {
  await fs.writeFile("./.stylelintrc.js", `"use strict"\nmodule.exports = ${ JSON.stringify(config) }`, "utf8")
  await exec("./node_modules/.bin/stylelint ./style.css --config ./.stylelintrc.js --fix")

  let css = await fs
    .readFile("./style.css", "utf8")
    .then((str) => str.split("\n"))
    .catch((error) => console.log(`${ error.name }: ${ error.message }`)) ?? undefined

  const propertyOrder = Object.keys(order)

  // Sort classes according to their first standard style property
  css = css.reduce((acc, curr) => {
    let isFound = false

    for (const property of propertyOrder) {
      if (curr.includes(` ${ property }: `)) {
        acc[property].push(curr)
        isFound = true
        break
      }
    }

    if (!isFound) {
      acc.others.push(curr)
    }

    return acc
  }, { ...order, others: [] })

  // Ensure more specific classes comes first (with more style properties)
  // Ensure letters comes before numbers
  propertyOrder
    .forEach((property) => {
      css[property]
        .sort((a, b) => {
          const baseA = a
            .replace(/^\.-/, ".")
            .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
          const baseB = b
            .replace(/^\.-/, ".")
            .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
          const lenA = baseA.match(/;/g)?.length ?? 0
          const lenB = baseB.match(/;/g)?.length ?? 0

          if (lenA !== lenB) {
            return ((lenA > lenB) ? -1 : 1)
          }

          return (sorting(baseA, baseB))
        })
    })

  // Ensure screens are grouped together for breakpoint sorting excluding [ 2xl, ... ]
  const screenList = [ "xs", ...Object.keys(tailwindConfig.theme.screens) ]
    .filter((curr) => curr.search(/\dxl/g) === -1)
    .toString()
    .replaceAll(/,/g, "|")
  const screenRegex = new RegExp(`-(?<!\\()(${ screenList })(?![a-z]|\\))`)

  // Ensure corners are grouped together
  // const cornerLetterList = [ "tl", "tr", "bl", "br" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const cornerLetterInsetRegex = new RegExp(`-(?<!\\()(${ cornerLetterList })(?![a-z]|\\))-`)
  // const cornerLetterEndRegex = new RegExp(`-(?<!\\()(${ cornerLetterList })(?![a-z]|\\))$`)

  // const cornerWordVerticalList = [ "top-left", "top-right", "bottom-left", "bottom-right" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const cornerWordVerticalInsetRegex = new RegExp(`-(?<!\\()(${ cornerWordVerticalList })(?![a-z]|\\))-`)
  // const cornerWordVerticalEndRegex = new RegExp(`-(?<!\\()(${ cornerWordVerticalList })(?![a-z]|\\))$`)

  // const cornerWordHorizontalList = [ "left-top", "left-bottom", "right-top", "right-bottom" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const cornerWordHorizontalInsetRegex = new RegExp(`-(?<!\\()(${ cornerWordHorizontalList })(?![a-z]|\\))-`)
  // const cornerWordHorizontalEndRegex = new RegExp(`-(?<!\\()(${ cornerWordHorizontalList })(?![a-z]|\\))$`)

  // Ensure `top | right | bottom | left` are grouped together
  // const directionLetterList = [ "t", "r", "b", "l" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const directionLetterInsetRegex = new RegExp(`-(?<!\\()(${ directionLetterList })(?![a-z]|\\))-`)
  // const directionLetterEndRegex = new RegExp(`-(?<!\\()(${ directionLetterList })(?![a-z]|\\))$`)

  // const directionWordList = [ "top", "right", "bottom", "left" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const directionWordInsetRegex = new RegExp(`(?<=[a-z0-9])-(?<!\\()(${ directionWordList })(?![a-z]|\\))-`)
  // const directionWordEndRegex = new RegExp(`(?<=[a-z0-9])-(?<!\\()(${ directionWordList })(?![a-z]|\\))$`)

  // Ensure `x | y` are grouped together
  // const xyList = [ "x", "y" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const xyInsetRegex = new RegExp(`-(?<!\\()(${ xyList })(?![a-z]|\\))-`)
  // const xyEndRegex = new RegExp(`-(?<!\\()(${ xyList })(?![a-z]|\\))$`)

  // Ensure `row | col` are grouped together
  // const rowcolSingularList = [ "row", "col" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const rowcolSingularInsetRegex = new RegExp(`-(?<!\\()(${ rowcolSingularList })(?![a-z]|\\))-`)
  // const rowcolSingularEndRegex = new RegExp(`-(?<!\\()(${ rowcolSingularList })(?![a-z]|\\))`)

  // const rowcolPluralList = [ "rows", "cols" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const rowcolPluralInsetRegex = new RegExp(`-(?<!\\()(${ rowcolPluralList })(?![a-z]|\\))-`)
  // const rowcolPluralEndRegex = new RegExp(`-(?<!\\()(${ rowcolPluralList })(?![a-z]|\\))`)

  // Ensure `start | end` are grouped together
  // const startendList = [ "start", "end" ]
  //   .toString()
  //   .replaceAll(/,/g, "|")
  // const startendInsetRegex = new RegExp(`-(?<!\\()(${ startendList })(?![a-z]|\\))-`)
  // const startendEndRegex = new RegExp(`-(?<!\\()(${ startendList })(?![a-z]|\\))`)

  // Ensure colours are grouped together
  const colourMonoList = [ "inherit", "transparent", "current", "black", "white" ]
    .toString()
    .replaceAll(/,/g, "|")
  const colourMonoRegex = new RegExp(`-(?<!\\()(${ colourMonoList })(?![a-z]|\\))`)

  const colourShadeList = Object.keys(tailwindColours)
    .filter((curr) => ![ "inherit", "transparent", "current", "black", "white" ].includes(curr))
    .sort((a, b) => (a.length < b.length) ? 1 : -1)
    .map((curr) => curr.toLowerCase())
    .toString()
    .replaceAll(/,/g, "|")
  const colourShadeRegex = new RegExp(`-(?<!\\()(${ colourShadeList })(?![a-z]|\\))`)

  // Ensure fontWeight are grouped together
  const fontWeightList = Object.keys(tailwindConfig.theme.fontWeight)
    .sort((a, b) => (a.length < b.length) ? 1 : -1)
    .toString()
    .replaceAll(/,/g, "|")
  const fontWeightRegex = new RegExp(`(?<=font)-(?<!\\()(${ fontWeightList })(?![a-z]|\\))`)

  // Ensure letterSpacing are grouped together
  const letterSpacingList = Object.keys(tailwindConfig.theme.letterSpacing)
    .sort((a, b) => (a.length < b.length) ? 1 : -1)
    .toString()
    .replaceAll(/,/g, "|")
  const letterSpacingRegex = new RegExp(`(?<=tracking)-(?<!\\()(${ letterSpacingList })(?![a-z]|\\))`)

  // Ensure lineHeight are grouped together
  const lineHeightList = Object.keys(tailwindConfig.theme.lineHeight)
    .filter((curr) => !Number.isInteger(Number(curr)))
    .toString()
    .replaceAll(/,/g, "|")
  const lineHeightRegex = new RegExp(`(?<=leading)-(?<!\\()(${ lineHeightList })(?![a-z]|\\))`)

  // Ensure classes are python regex compatible
  ;[ ...propertyOrder, "others" ]
    .forEach((property) => {
      css[property] = css[property]
        .map((curr) => curr
          .split(curr.includes(" >") ? " >" : " {")[0] // Remove all but class names
          .slice(1) // Removes dot (css class identifier)
          .replaceAll(/\\/g, "\\") // Escape backslash in css names
          .replaceAll(/\d+/g, "\\d{1,4}") // Replace numbers to \d{4}
          .replace(screenRegex, `-(${ screenList })`)
          // .replace(cornerWordVerticalInsetRegex, `-(${ cornerWordVerticalList })-`)
          // .replace(cornerWordVerticalEndRegex, `-(${ cornerWordVerticalList })`)
          // .replace(cornerWordHorizontalInsetRegex, `-(${ cornerWordHorizontalList })-`)
          // .replace(cornerWordHorizontalEndRegex, `-(${ cornerWordHorizontalList })`)
          // .replace(cornerLetterInsetRegex, `-(${ cornerLetterList })-`)
          // .replace(cornerLetterEndRegex, `-(${ cornerLetterList })`)
          // .replace(directionWordInsetRegex, `-(${ directionWordList })-`)
          // .replace(directionWordEndRegex, `-(${ directionWordList })`)
          // .replace(directionLetterInsetRegex, `-(${ directionLetterList })-`)
          // .replace(directionLetterEndRegex, `-(${ directionLetterList })`)
          // .replace(rowcolPluralInsetRegex,`-(${ rowcolPluralList })-`)
          // .replace(rowcolPluralEndRegex,`-(${ rowcolPluralList })`)
          // .replace(rowcolSingularInsetRegex,`-(${ rowcolSingularList })-`)
          // .replace(rowcolSingularEndRegex,`-(${ rowcolSingularList })`)
          // .replace(startendInsetRegex,`-(${ startendList })-`)
          // .replace(startendEndRegex,`-(${ startendList })`)
          // .replace(xyInsetRegex, `-(${ xyList })-`)
          // .replace(xyEndRegex, `-(${ xyList })`)
          .replace(colourMonoRegex, `-(${ colourMonoList })`)
          .replace(colourShadeRegex, `-(${ colourShadeList })`)
          .replace(fontWeightRegex, `-(${ fontWeightList })`)
          .replace(letterSpacingRegex, `-(${ letterSpacingList })`)
          .replace(lineHeightRegex, `-(${ lineHeightList })`),
        )
        .map((curr) => curr.startsWith("-")
          ? `-{0,1}${ curr.slice(1) }`
          : curr,
        ) // Add optional negative `-{0,1}` for classes with negative prefix
        .map((curr) =>
          (!curr.startsWith("-{0,1}") && curr.includes("\\d") && !curr.includes("gray") && !curr.includes("black"))
            ? `-{0,1}${ curr }`
            : curr,
        ) // Add optional negative `-{0,1}` for classes with numbers that are not colours
        .filter((curr, idx, arr) =>
          !(!curr.startsWith("-{0,1}") && arr.includes(`-{0,1}${ curr }`)),
        ) // Remove redundant classes after adding optional negative `-{0,1}`
    })

  // Ensure less hyphens comes before more hyphens
  // Ensure letters comes before numbers
  // Ensure classes are sorted alphabetically
  propertyOrder
    .forEach((property) => {
      css[property]
        .sort((a, b) => {
          const baseA = a
            .replace(/^-/, "")
            .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
          const baseB = b
            .replace(/^-/, "")
            .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
          const wordsA = a.split("-")
          const wordsB = b.split("-")

          if (wordsA.length !== wordsB.length) {
            return ((wordsA.length > wordsB.length) ? 1 : -1)
          }

          if (a.includes("d{1,4}") && !b.includes("d{1,4}")) {
            return (1)
          }

          if (!a.includes("d{1,4}") && b.includes("d{1,4}")) {
            return (-1)
          }

          return (sorting(baseA, baseB))
        })
    })

  // Ensure letters comes before numbers
  // Ensure classes are sorted alphabetically
  css.others
    .sort((a, b) => {
      const baseA = a
        .replace(/^-/, "")
        .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
      const baseB = b
        .replace(/^-/, "")
        .replaceAll(/\s--tw-[\da-z-]+:\s[\d%.a-z]+;\s/g, " ")
      const lenA = baseA.match(/;/g)?.length ?? 0
      const lenB = baseB.match(/;/g)?.length ?? 0

      if (lenA !== lenB) {
        return ((lenA > lenB) ? -1 : 1)
      }

      if (a.includes("d{1,4}") && !b.includes("d{1,4}")) {
        return (1)
      }

      if (!a.includes("d{1,4}") && b.includes("d{1,4}")) {
        return (-1)
      }

      return (sorting(baseA, baseB))
    })

  // Flatten sorted arrays
  let flattened = [ ...propertyOrder, "others" ]
    .reduce((acc, curr) => {
      const properties = css[curr]
        .filter((str) => str.length > 0)

      return ([ ...acc, ...properties ])
    }, [])

  // Remove duplicates
  flattened = [ ...new Set(flattened) ]

  // Group similar classes for quicker matches using list of lists
  const list = flattened
    .reduce((acc, curr, index) => {
      const str = curr
        .slice((curr.indexOf("-{0,1}") === 0) ? 6 : 0)
        .split("-")
      const key = str[(str[0].length > 0 && ![ "no", "not", "min", "max", "auto" ].includes(str[0])) ? 0 : 1]

      switch (key) {
        case acc?.at(-1)?.[0]: {
          acc.at(-1)[1].push(curr)
          break
        }
        case acc?.at(-2)?.[0]: {
          acc.at(-2)[1].push(curr)
          break
        }
        case acc?.at(-3)?.[0]: {
          acc.at(-3)[1].push(curr)
          break
        }
        default: {
          acc.push([ key, [ curr ]])
        }
      }

      return acc
    }, [])

  return ({ order: list })
}

module.exports = {
  generator,
}
