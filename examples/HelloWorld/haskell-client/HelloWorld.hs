-- Pragmas
{-# OPTIONS_GHC -fno-warn-unused-imports #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE TupleSections #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE NoImplicitPrelude #-}

-- Module
module Colorless.Examples.HelloWorld
  ( helloWorld'Version
  , Hello(..)
  , Goodbye(..)
  , Color(..)
  , Color'Custom'Members(..)
  , hello
  , goodbye
  , hello'Mk
  , goodbye'Mk
  , color'Red'Mk
  , color'Blue'Mk
  , color'Green'Mk
  , color'Yellow'Mk
  , color'Custom'Mk
  , hello'Pure
  , goodbye'Pure
  , color'Pure
  ) where

-- Imports
import qualified Prelude as P
import qualified Data.Map as Map
import qualified Control.Monad.IO.Class as IO
import qualified Data.Aeson as A
import qualified Data.Text as T
import qualified Data.Text.Conversions as T
import qualified Data.String as P (IsString)
import qualified Data.Word as I
import qualified Data.Int as I
import qualified Data.IORef as IO
import qualified GHC.Generics as P (Generic)
import qualified Colorless.Client as C
import qualified Colorless.Client.Expr as C
import qualified Colorless.Ast as Ast

-- Version
helloWorld'Version :: C.Version
helloWorld'Version = C.Version 2 0

hello :: C.Expr Hello -> C.Expr T.Text
hello expr'' = C.unsafeExpr (Ast.Ast'StructCall (Ast.StructCall "Hello" (Ast.toAst expr'')))

goodbye :: C.Expr Goodbye -> C.Expr ()
goodbye expr'' = C.unsafeExpr (Ast.Ast'StructCall (Ast.StructCall "Goodbye" (Ast.toAst expr'')))

-- Struct: Hello
data Hello = Hello
  { who :: T.Text
  } deriving (P.Show, P.Eq, P.Generic)

instance C.HasType Hello where
  getType _ = "Hello"

instance A.ToJSON Hello

instance C.ToVal Hello where
  toVal Hello
    { who
    } = C.Val'ApiVal P.$ C.ApiVal'Struct P.$ C.Struct P.$ Map.fromList
    [ ("who", C.toVal who)
    ]

instance C.FromVal Hello where
  fromVal = \case
    C.Val'ApiVal (C.ApiVal'Struct (C.Struct m)) -> Hello
      P.<$> C.getMember m "who"
    _ -> P.Nothing

instance Ast.ToAst Hello where
  toAst Hello
    { who
    } = Ast.Struct P.$ Map.fromList
    [ ("who", Ast.toAst who)
    ]

hello'Mk :: C.Expr (T.Text -> Hello)
hello'Mk = C.unsafeStructExpr ["who"]

hello'Pure :: Hello -> C.Expr Hello
hello'Pure = C.unsafeExpr . Ast.toAst

-- Struct: Goodbye
data Goodbye = Goodbye
  { target :: T.Text
  } deriving (P.Show, P.Eq, P.Generic)

instance C.HasType Goodbye where
  getType _ = "Goodbye"

instance A.ToJSON Goodbye

instance C.ToVal Goodbye where
  toVal Goodbye
    { target
    } = C.Val'ApiVal P.$ C.ApiVal'Struct P.$ C.Struct P.$ Map.fromList
    [ ("target", C.toVal target)
    ]

instance C.FromVal Goodbye where
  fromVal = \case
    C.Val'ApiVal (C.ApiVal'Struct (C.Struct m)) -> Goodbye
      P.<$> C.getMember m "target"
    _ -> P.Nothing

instance Ast.ToAst Goodbye where
  toAst Goodbye
    { target
    } = Ast.Struct P.$ Map.fromList
    [ ("target", Ast.toAst target)
    ]

goodbye'Mk :: C.Expr (T.Text -> Goodbye)
goodbye'Mk = C.unsafeStructExpr ["target"]

goodbye'Pure :: Goodbye -> C.Expr Goodbye
goodbye'Pure = C.unsafeExpr . Ast.toAst

-- Enumeration: Color
data Color
  = Color'Red 
  | Color'Blue
  | Color'Green
  | Color'Yellow
  | Color'Custom Color'Custom'Members
  deriving (P.Show, P.Eq)

instance C.HasType Color where
  getType _ = "Color"

data Color'Custom'Members = Color'Custom'Members
  { r :: I.Word8
  , g :: I.Word8
  , b :: I.Word8
  } deriving (P.Show, P.Eq, P.Generic)

instance A.ToJSON Color'Custom'Members

instance A.ToJSON Color where
  toJSON = \case
    Color'Red -> A.object [ "tag" A..= ("Red" :: T.Text) ]
    Color'Blue -> A.object [ "tag" A..= ("Blue" :: T.Text) ]
    Color'Green -> A.object [ "tag" A..= ("Green" :: T.Text) ]
    Color'Yellow -> A.object [ "tag" A..= ("Yellow" :: T.Text) ]
    Color'Custom m -> C.combineObjects (A.object [ "tag" A..= ("Custom" :: T.Text) ]) (A.toJSON m)

instance C.FromVal Color where
  fromVal = \case
    C.Val'ApiVal (C.ApiVal'Enumeral (C.Enumeral tag m)) -> case (tag,m) of
      ("Red", P.Nothing) -> P.Just Color'Red
      ("Blue", P.Nothing) -> P.Just Color'Blue
      ("Green", P.Nothing) -> P.Just Color'Green
      ("Yellow", P.Nothing) -> P.Just Color'Yellow
      ("Custom", P.Just m') -> Color'Custom P.<$> (Color'Custom'Members
          P.<$> C.getMember m' "r"
          P.<*> C.getMember m' "g"
          P.<*> C.getMember m' "b"
        )
      _ -> P.Nothing
    _ -> P.Nothing

instance C.ToVal Color where
  toVal = \case
    Color'Red -> C.Val'ApiVal P.$ C.ApiVal'Enumeral P.$ C.Enumeral "Red" P.Nothing
    Color'Blue -> C.Val'ApiVal P.$ C.ApiVal'Enumeral P.$ C.Enumeral "Blue" P.Nothing
    Color'Green -> C.Val'ApiVal P.$ C.ApiVal'Enumeral P.$ C.Enumeral "Green" P.Nothing
    Color'Yellow -> C.Val'ApiVal P.$ C.ApiVal'Enumeral P.$ C.Enumeral "Yellow" P.Nothing
    Color'Custom Color'Custom'Members
      { r
      , g
      , b
      } -> C.Val'ApiVal P.$ C.ApiVal'Enumeral P.$ C.Enumeral "Custom" P.$ P.Just P.$ Map.fromList
      [ ("r", C.toVal r)
      , ("g", C.toVal g)
      , ("b", C.toVal b)
      ]

instance Ast.ToAst Color where
  toAst = \case
    Color'Red -> Ast.Ast'Enumeral P.$ Ast.Enumeral "Red" P.Nothing
    Color'Blue -> Ast.Ast'Enumeral P.$ Ast.Enumeral "Blue" P.Nothing
    Color'Green -> Ast.Ast'Enumeral P.$ Ast.Enumeral "Green" P.Nothing
    Color'Yellow -> Ast.Ast'Enumeral P.$ Ast.Enumeral "Yellow" P.Nothing
    Color'Custom Color'Custom'Members
      { r
      , g
      , b
      } -> Ast.Ast'Enumeral P.$ Ast.Enumeral "Custom" P.$ P.Just P.$ Map.fromList
      [ ("r", Ast.toAst r)
      , ("g", Ast.toAst g)
      , ("b", Ast.toAst b)
      ]

color'Red'Mk :: C.Expr Color
color'Red'Mk = C.unsafeExpr . Ast.toAst $ Color'Red

color'Blue'Mk :: C.Expr Color
color'Blue'Mk = C.unsafeExpr . Ast.toAst $ Color'Blue

color'Green'Mk :: C.Expr Color
color'Green'Mk = C.unsafeExpr . Ast.toAst $ Color'Green

color'Yellow'Mk :: C.Expr Color
color'Yellow'Mk = C.unsafeExpr . Ast.toAst $ Color'Yellow

color'Custom'Mk :: C.Expr (I.Word8 -> I.Word8 -> I.Word8 -> Color)
color'Custom'Mk = C.unsafeEnumeralExpr "Custom" ["r", "g", "b"]

color'Pure :: Color -> C.Expr Color
color'Pure = C.unsafeExpr . Ast.toAst

