# Atari Engine Skull Formulas

Live page: https://plabs.at.ua/bpot/2020/atari.htm

## Skull Outline (recommended starting point)

- **Steps**: 220
- **X**: `220+Math.cos(o*Math.PI/110)*(75+Math.sin(o*Math.PI/110)*10)`
- **Y**: `150+Math.sin(o*Math.PI/110)*(110+Math.cos(o*Math.PI/55)*25)`
- **Brush**: A dot 0.0.0 ---gif (or any point/dot)
- **Color**: #000000 (if the field allows it)

Click **change** after pasting.

## Eye Sockets (second pass)

**Left eye**
- Steps: 60
- X: `175+Math.cos(o*Math.PI/30)*18`
- Y: `140+Math.sin(o*Math.PI/30)*18`

**Right eye**
- Steps: 60
- X: `265+Math.cos(o*Math.PI/30)*18`
- Y: `140+Math.sin(o*Math.PI/30)*18`

## Notes

The engine evaluates the X/Y formulas once per step as the variable `o` increases. Layer multiple passes by clearing or drawing on top.

No remote browser control exists yet. These formulas must be entered in the visible tab.
