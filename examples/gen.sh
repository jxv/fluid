#! /bin/sh

# HelloWorld
colorless -l haskell -s HelloWorld -m Colorless.Examples.HelloWorld -n HelloWorld -d ./HelloWorld/haskell-server -e server
colorless -l haskell -s HelloWorld -m Colorless.Examples.HelloWorld -n HelloWorld -d ./HelloWorld/haskell-client -e client
colorless -l javascript -s HelloWorld -n helloWorld -d ./HelloWorld/javascript-client -e client

# Phonebook
colorless -l haskell -s Phonebook -m Colorless.Examples.Phonebook -n Phonebook -d ./Phonebook/haskell-server -e server
colorless -l haskell -s Phonebook -m Colorless.Examples.Phonebook -n Phonebook -d ./Phonebook/haskell-client -e client
colorless -l javascript -s Phonebook -n phonebook -d ./Phonebook/javascript-client -e client