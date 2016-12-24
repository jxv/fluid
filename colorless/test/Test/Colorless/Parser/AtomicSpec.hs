{-# LANGUAGE RankNTypes #-}
module Test.Colorless.Parser.AtomicSpec (spec) where

import Pregame

import Test.Hspec
import Test.Fixie
import Text.Megaparsec.Prim

import Colorless.Parser.Atomic
import Colorless.Parser.Types
import Colorless.Parser

spec :: Spec
spec = do
  describe "literal'" $ do
    it "should parse \"abc\"" $ do
      actual <- liftIO $ runParserM (literal' "abc") "abc"
      actual `shouldBe` Right "abc"
  describe "token'" $ do
    it "should parse \"()\" as ()" $ do
      actual <- liftIO $ runParserM (token' "()" ()) "()"
      actual `shouldBe` Right ()
  describe "match'" $ do
    it "should parse \"c\" as 'c'" $ do
      let alphabet = literal' "abc" :| [literal' "def", literal' "ghi"]
      actual <- liftIO $ runParserM (match' alphabet) "ghi"
      actual `shouldBe` Right "ghi"