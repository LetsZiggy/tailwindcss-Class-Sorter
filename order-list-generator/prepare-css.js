"use strict"

const fs = require("fs/promises")
const colors = require("tailwindcss/colors")

const colorStr = [ "inherit", "transparent", "current", ...Object.keys(colors) ]
  .map((curr) => curr.toLowerCase())
  .join("|")
const colorRegex = new RegExp(`[${ colorStr }]`, "gi")
const colorShadesRegex = new RegExp(`(?<=[${ colorStr }]-)[1-9][0]{2}`, "g")
const widthMinMaxRegex = new RegExp(`(?<=\\\.w-(min|max)\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const insetRegex = new RegExp(`(?<=\\\.[-]?inset-[a-z0-9-\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const mxmyRegex = new RegExp(`(?<=\\\.[-]?m[xy]-[a-z0-9\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const spaceRegex = new RegExp(`(?<=\\\.[-]?space-[xy]-[a-z0-9\\\/\\\\\\\.]+\\\s>\\\s:not\\\(\\\[hidden\\\]\\\)\\\s~\\\s:not\\\(\\\[hidden\\\]\\\)\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const pxpyRegex = new RegExp(`(?<=\\\.p[xy]-[a-z0-9\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const borderOpacityRegex = new RegExp(`(?<=\\\.border-opacity-[a-z0-9\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const divideRegex = new RegExp(`(?<=\\\.divide-[xy](-[a-z0-9]+)?\\\s>\\\s:not\\\(\\\[hidden\\\]\\\)\\\s~\\\s:not\\\(\\\[hidden\\\]\\\)\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const divideOpacityRegex = new RegExp(`(?<=\\\.divide-opacity-[a-z0-9\\\/\\\\\\\.]+\\\s>\\\s:not\\\(\\\[hidden\\\]\\\)\\\s~\\\s:not\\\(\\\[hidden\\\]\\\)\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const colorOpacityRegex = new RegExp(`(?<=\\\.bg-opacity-[a-z0-9\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")
const textOpacityRegex = new RegExp(`(?<=\\\.text-opacity-[a-z0-9\\\/\\\\\\\.]+\\\s{\\\s)[^}]+(?=\\\s})`, "g")

;(async function () {
  const css = await fs
    .readFile("./style.css", "utf8")
    .then((str) => str.replaceAll(/(?<!;\s|,|\/\*!\*\/\s)\/\*[\s\w!"#'()*,./:<=>?`{|}\-]+\*\//g, "")) // Remove outer comments (leaves comments in styles alone)
    .then((str) => str.replaceAll(/{\n/g, "{ ")) // Removes newline after "{"
    .then((str) => str.replaceAll(/\n}/g, " }")) // Removes newline before "}"
    .then((str) => str.replaceAll(/(;|:|,|\*\/)\n/g, "$1 ")) // Removes newline after ; | : | , | */ (end of comment in styles)
    .then((str) => str.replaceAll(/ +/g, " ")) // Trims spaces
    .then((str) => str.replaceAll(/\n+/g, "\n")) // Trims newlines
    .then((str) => str.replaceAll(/(?<=[\da-z]):{1,2}[a-z\-]+(?=\s{)/g, "")) // Removes vendor-prefixes
    .then((str) => str.replaceAll(/(?<=\s)(-?\d+\.\d+|-?\.\d+|-?\d+)(?=(\s\d+|\sauto|vh|vw|ch|rem|em|px|fr|deg|s|ms|%|\s-|\s\/|;))/g, "0")) // Convert integer/float css values to `0`
    .then((str) => str.replaceAll(/(?<=\()([.-]?\d+\.\d+|-?\.\d+|[.-]?\d+)(?=(\s\d+|\sauto|vh|vw|ch|rem|em|px|fr|deg|s|ms|%|\s-)?([\s),]))/g, "0")) // Convert all single args integer/float to `0`
    .then((str) => str.replaceAll(/(?<=\()\s?(\d+\.\d+|\d+),\s?(\d+\.\d+|\d+),\s?(\d+\.\d+|\d+),\s?(\d+\.\d+|\d+)(?=,|\))/g, "0,0,0,0")) // Convert all quadruple args integer/float to `0,0,0`
    .then((str) => str.replaceAll(/(?<=\()(\d+\.\d+|\d+), (\d+\.\d+|\d+), (\d+\.\d+|\d+)(?=,|\))/g, "0,0,0")) // Convert all triple args integer/float to `0,0,0`
    .then((str) => str.replaceAll(/(?<=#)\w{3,6}(?=[),;])/g, "000")) // Convert all hex to `000`
    .then((str) => str.replaceAll(/(?<=-)\d+(?=xl|:|\s>|\s{)/g, "0")) // Convert classes ending with number to `0`
    .then((str) => str.replaceAll(/(?<=-)\d+\\\/\d+(?=xl|:|\s>|\s{)/g, "0\\/5")) // Convert classes ending with fraction to `0\/5`
    .then((str) => str.replaceAll(/(?<=-)\d+\\\.\d+(?=xl|:|\s>|\s{)/g, "0\\.5")) // Convert classes ending with float to `0\.5`
    .then((str) => str.replaceAll(colorRegex, (string) => string.toLowerCase())) // Lowercase all colour classes
    .then((str) => str.replaceAll(colorShadesRegex, "50")) // Convert all colour classes with shades to `50`
    .then((str) => str.replaceAll(widthMinMaxRegex, "width: 0;")) // Convert `w-(min|max)` classes styles to `width: 0;`
    .then((str) => str.replaceAll(insetRegex, "inset: 0;")) // Convert all inset classes styles to `inset: 0;`
    .then((str) => str.replaceAll(mxmyRegex, "margin: 0;")) // Convert all `mx|my` classes styles to `margin: 0;`
    .then((str) => str.replaceAll(spaceRegex, "margin: 0; margin-top: 0; margin-right: 0; margin-bottom: 0; margin-left: 0;")) // Convert all space classes styles to `margin: 0; margin-top: 0; margin-right: 0; margin-bottom: 0; margin-left: 0;`
    .then((str) => str.replaceAll(pxpyRegex, "padding: 0;")) // Convert all `px|py` classes styles to `padding: 0;`
    .then((str) => str.replaceAll(borderOpacityRegex, "border-color: rgba(0,0,0,0);")) // Convert all border-opacity classes styles to `border-color: rgba(0,0,0,0);`
    .then((str) => str.replaceAll(divideRegex, "border-width: 0; border-top-width: 0; border-right-width: 0; border-bottom-width: 0; border-left-width: 0;")) // Convert all divide classes styles to `border-width: 0; border-top-width: 0; border-right-width: 0; border-bottom-width: 0; border-left-width: 0;`
    .then((str) => str.replaceAll(divideOpacityRegex, "border-color: rgba(0,0,0,0);")) // Convert all divide-opacity classes styles to `border-color: rgba(0,0,0,0);`
    .then((str) => str.replaceAll(colorOpacityRegex, "background-color: rgba(0,0,0,0);")) // Convert all bg-opacity classes styles to `background-color: rgba(0,0,0,0);`
    .then((str) => str.replaceAll(textOpacityRegex, "color: rgba(0,0,0,0);")) // Convert all text-opacity classes styles to `color: rgba(0,0,0,0);`
    .then((str) => str.split("\n"))
    .then((arr) => arr.filter((line) => line.startsWith("."))) // Removes all non-class styles
    .then((arr) => arr.reduce((acc, line) => {
      if (line.search(/\.\w[\w\-]+, \.\w[\w\-]+/) > -1) {
        const classes = line
          .split(" {")[0] // Get only classes
          .split(", ") // Split classes
        const styles = `{ ${ line.split(" { ")[1] }`

        line = classes.reduce(
          (strAcc, className) =>
            `${ strAcc }${ strAcc.length > 0 ? "\n" : "" }${ className } ${ styles }`,
          "",
        )
      }

      return [ ...acc, line ]
    }, [])) // Ensure one class per line (Duplicate and split multiple classes)
    .then((arr) => [ ...new Set(arr) ]) // Remove duplicate classes and styles
    .then((arr) => arr.join("\n"))
    .catch((error) => console.log(`${ error.name }: ${ error.message }`)) ?? undefined

  fs.writeFile("./style.css", `${ css }\n`, "utf8")
})()
