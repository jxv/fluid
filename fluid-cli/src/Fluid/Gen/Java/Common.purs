module Fluid.Gen.Java.Common where

import Prelude
import Data.Traversable (traverse_)
import Data.Foldable (intercalate)

import Fluid.Gen.Lines
import Fluid.Gen.Plan

genStruct :: Struct -> Lines Unit
genStruct {name, members, indirection} = do
  line ""
  addLine ["// Struct: ", name]
  addLine ["public class ", name, " {"]
  flip traverse_ members $ \member ->
    addLine ["    public ", member.type, " ", member.name, ";"]
  line ""
  addLine $
    ["    public ", name,"("] <>
    [intercalate ", " (map (\m -> m.type <> " _" <> m.name) members)] <>
    [") {"]
  flip traverse_ members $ \member ->
    addLine ["        ", member.name, " = _", member.name, ";"]
  line "    }"
  line "}"
