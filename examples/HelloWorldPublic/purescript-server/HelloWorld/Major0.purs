-- Module
module HelloWorld.Major0
  ( helloWorld'version
  , helloWorld'pull
  , helloWorld'handler
  , helloWorld'spec
  , HelloWorld'Thrower(..)
  , HelloWorld'Service(..)
  , Hello(..)
  ) where

-- Imports
import Prelude as P
import Control.Monad as P
import Control.Monad.Except as M
import Data.IORef as IO
import Data.String as P (IsString)
import Fluid.Imports as R
import Fluid.Server as C

--------------------------------------------------------
-- Configs
--------------------------------------------------------

-- Version
helloWorld'version :: C.Version
helloWorld'version = C.Version 0 0

helloWorld'pull :: C.Pull
helloWorld'pull = C.Pull "http" "127.0.0.1" "/" 8080

--------------------------------------------------------
-- Interfaces
--------------------------------------------------------

-- Thrower
class C.ServiceThrower m <= HelloWorld'Thrower m where
  helloWorld'throw :: () -> m a
  helloWorld'throw = C.serviceThrow P.. R.toJSON P.. C.toVal

-- Service
class P.Monad m <= HelloWorld'Service meta m where
  helloWorld'Hello :: meta -> Hello -> m P.String

instance HelloWorld'Service meta m => HelloWorld'Service meta (M.ExceptT C.Response m) where
  helloWorld'Hello _meta = M.lift P.. helloWorld'Hello _meta

--------------------------------------------------------
-- Types
--------------------------------------------------------

-- Struct: Hello
data Hello = Hello
  { target :: P.String
  }

--------------------------------------------------------
-- Add-ons
--------------------------------------------------------

--------------------------------------------------------
-- Request handling
--------------------------------------------------------

-- Handler
helloWorld'handler
  :: (HelloWorld'Service meta m, R.MonadIO m, R.MonadCatch m)
  => (xtra -> C.Hooks m () meta)
  -> xtra
  -> C.Request
  -> m (P.Either C.Response C.Response)
helloWorld'handler _hooksBuilder xtra C.Request{C.meta=meta, C.query=query} = R.catch
  (M.runExceptT P.$ do
    meta' <- P.maybe (C.runtimeThrow C.RuntimeError'UnparsableMeta) P.return (C.fromValFromJson meta)
    let _hooks = _hooksBuilder xtra
    xformMeta <- M.lift P.$ C.metaMiddleware _hooks meta'
    envRef <- R.liftIO C.emptyEnv
    variableBaseCount <- R.liftIO (R.size P.<$> IO.readIORef envRef)
    _limits <- M.lift P.$ C.sandboxLimits _hooks xformMeta
    let _limits' = _limits
          { C.variables = P.fmap (P.+ variableBaseCount) (C.variables _limits)
          }
    _serviceCallCountRef <- R.liftIO (IO.newIORef 0)
    _lambdaCountRef <- R.liftIO (IO.newIORef 0)
    _exprCountRef <- R.liftIO (IO.newIORef 0)
    let evalConfig = C.EvalConfig
          { C.limits = _limits'
          , C.langServiceCallCount = _serviceCallCountRef
          , C.langLambdaCount = _lambdaCountRef
          , C.langExprCount = _exprCountRef
          , C.apiCall = helloWorld'ApiCall xformMeta
          }
    query' <- P.maybe (C.runtimeThrow C.RuntimeError'UnparsableQuery) P.return (C.jsonToExpr query)
    vals <- C.runEval (C.forceVal P.=<< C.eval query' envRef) evalConfig
    P.return P.$ C.Response'Success (R.toJSON vals) _limits)
  (\(C.ThrownValue _err) -> P.return P.. P.Left P.$ C.Response'Error (C.ResponseError'Service _err))

-- API
helloWorld'ApiCall :: (HelloWorld'Service meta m, C.ServiceThrower m, C.RuntimeThrower m) => meta -> C.ApiCall -> m C.Val
helloWorld'ApiCall meta' apiCall' = case C.parseApiCall helloWorld'ApiParser apiCall' of
  P.Nothing -> C.runtimeThrow (C.RuntimeError'UnrecognizedCall P.$ C.apiCallName apiCall')
  P.Just x' -> case x' of
    HelloWorld'Api'Hello a' -> C.toVal P.<$> helloWorld'Hello meta' a'

-- API Parser
helloWorld'ApiParser :: C.ApiParser HelloWorld'Api
helloWorld'ApiParser = C.ApiParser
  { C.hollow = R.empty
  , C.struct = R.fromList
     [ ("Hello", v HelloWorld'Api'Hello)
     ]
  , C.enumeration = R.empty
  , C.wrap = R.empty
  }
  where
    v x y = x P.<$> C.fromVal y

-- Api
data HelloWorld'Api
  = HelloWorld'Api'Hello Hello

--------------------------------------------------------
-- Type Instances
--------------------------------------------------------

instance C.ToVal Hello where
  toVal Hello
    { target
    } = C.Val'ApiVal P.$ C.ApiVal'Struct P.$ C.Struct P.$ R.fromList
    [ ("target", C.toVal target)
    ]

instance C.FromVal Hello where
  fromVal = \case
    C.Val'ApiVal (C.ApiVal'Struct (C.Struct _m)) -> Hello
      P.<$> C.getMember _m "target"
    _ -> P.Nothing

instance R.ToJSON Hello where
  toJSON = R.toJSON P.. C.toVal

instance R.FromJSON Hello where
  parseJSON _v = do
    _x <- R.parseJSON _v
    case C.fromVal _x of
      P.Nothing -> P.mzero
      P.Just _y -> P.return _y

--------------------------------------------------------
-- Spec
--------------------------------------------------------

helloWorld'spec :: R.Value
helloWorld'spec = v
  where P.Just v = R.decode "{\"fluid\":{\"major\":0,\"minor\":0},\"version\":{\"major\":0,\"minor\":0},\"schema\":{\"Hello\":{\"m\":[{\"target\":\"String\"}],\"o\":\"String\"}},\"pull\":{\"protocol\":\"http\",\"name\":\"HelloWorld\",\"host\":\"127.0.0.1\",\"meta\":\"Unit\",\"path\":\"/\",\"port\":8080,\"error\":\"Unit\"}}"