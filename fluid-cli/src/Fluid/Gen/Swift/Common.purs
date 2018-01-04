module Fluid.Gen.Swift.Common where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), isJust)
import Data.Traversable (traverse_)
import Fluid.Gen.Spec (Version)
import Fluid.Gen.Lines
import Fluid.Gen.Plan

genWrap :: Wrap -> Lines Unit
genWrap {name, type: type', label, instances: {text, number}} = do
  line ""
  addLine ["// Wrap: ", name]
  addLine ["typealias ", name, " = ", type']

genStruct :: Struct -> Lines Unit
genStruct {name, label, members} = do
  line ""
  addLine ["// Struct: ", name]
  addLine ["struct ", name, " {"]
  flip traverse_ members $ \member ->
    addLine ["    let ", member.name, ": ", member.type]
  line "}"

genEnumeration :: Enumeration -> Lines Unit
genEnumeration {name, enumerals} = do
  line ""
  addLine ["// Enumeration: ", name]
  line "#[derive(Debug)]"
  addLine ["enum ", name, " {"]

  flip traverse_ enumerals $ \enumeral ->
    addLine $
      ["    ", enumeral.tag] <>
      (case enumeral.members of
        Nothing -> [""]
        Just _ -> ["(", name, "_", enumeral.tag, ")"]) <>
      [","]
  line "}"
