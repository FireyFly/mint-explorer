**Mint Explorer** is a tool for exploring archive/package files for the Mint
scripting engine, found in various video games, notably games from the Kirby
series.  It parses an input file (containing packages, files, classes, methods,
fields and constants) into a tree and disassembles methods when selected in
the tree view.

Mint Explorer is written based on reverse-engineering work performed by
observing several instances of bytecode files in order to deduce the structure
(and meaning of the bytecode) in them.

You can find a public version at [firefly.nu/pub/mint-explorer][web-public] (possibly
not the latest version).

## Usage
  Currently, only *Return to Dream Land* and *Triple Deluxe* are supported.
  Make sure that you have a decompressed Mint bytecode archive (e.g.
  mint/Archive.bin).  Open mint-explorer, browse for the Mint archive--it
  should load, but the loading happens in the main thread which means the
  browser might freeze for a few seconds.

  Once you have a file loaded, you should be able to expand package tree to
  the left.  Packages contain Mint files, which hold static data (sdata),
  references to different entitites (xrefs), and classes (typically exactly
  one).  Classes contain fields, constants (in K3D) and methods.

  Clicking methods will disassemble them and show a pretty-printed
  disassembly--this is the main usage of Mint Explorer.  You can also view the
  sdata and xref sections of a Mint file (hexdump and ASCII table,
  respectively), and when clicking a package or file, you get a tally of
  opcode frequency within this part of the tree (for my own reversing
  purposes).

## Documentation
  The format is documented on the repository wiki: [Mint bytecode (RTDL)][wiki-bytecode-rtdl].

## Screenshot
  ![Screenshot](meta/screenshot.png "Demo of Mint Explorer viewing a simple Pong game")

## License
  ISC

[web-public]: http://firefly.nu/pub/mint-explorer/
[wiki-bytecode-rtdl]: https://github.com/FireyFly/mint-explorer/wiki/Mint-bytecode:-RTDL
