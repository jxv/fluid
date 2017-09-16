
const primMap = {
  'Bool': 'P.Bool',
  'U8': 'I.Word8',
  'U16': 'I.Word16',
  'U32': 'I.Word32',
  'U64': 'I.Word64',
  'I8': 'I.Int8',
  'I16': 'I.Int16',
  'I32': 'I.Int32',
  'I64': 'I.Int64',
  'F32': 'P.Float',
  'F64': 'P.Float',
  'Char': 'P.Char',
  'String': 'T.Text',
};


const genWrap = ({name, type, instances}) => {
  var lines = [
    '\n',
    '-- Wrap: ', name , '\n',
    'newtype ', name , ' = ', name, ' ', type, '\n',
  ];
  lines = lines.concat([
    '  deriving (P.Show, P.Eq, ', instances.text ? 'P.IsString, T.ToText, ' : '', instances.number ? 'P.Num, ' : '', 'A.FromJSON, A.ToJSON, C.ToVal, C.FromVal)', '\n',
  ]);
  return lines.join('');
};


const genStruct = ({name, members}) => {
  // Data type declaration
  const declName = [
    '\n',
    '-- Struct: ', name, '\n',
    'data ', name, ' = ', name, '\n',
  ];
  var declMembers = ['  { ', members[0].name, ' :: ', members[0].type, '\n'];
  for (var i = 1; i < members.length; i++) {
    declMembers = declMembers.concat(['  , ', members[i].name, ' :: ', members[i].type, '\n']);
  }
  var declDeriving = '  } deriving (P.Show, P.Eq, P.Generic)\n\n';
  const decl = declName.concat(declMembers).concat([declDeriving]);

  // ToJSON instance
  const toJSON  = [
    '\n',
    'instance A.ToJSON ', name, '\n',
  ];

  // ToVal instance
  const toValDecl = [
    '\n',
    'instance C.ToVal ', name, ' where', '\n',
    '  toVal ', name, '\n',
  ];
  var toValDecons = ['    { ', members[0].name, '\n'];
  for (var i = 1; i < members.length; i++) {
    toValDecons = toValDecons.concat(['    , ', members[i].name, '\n']);
  }
  toValDecons.push('    }');
  var toValDef = [
    ' = C.Val\'ApiVal P.$ C.ApiVal\'Struct P.$ C.Struct P.$ Map.fromList\n',
    '    [ ("', members[0].label, '", C.toVal ', members[0].name, ')\n',
  ];
  for (var i = 1; i < members.length; i++) {
    toValDef = toValDef.concat(['    , ("', members[i].label, '", C.toVal ', members[i].name, ')\n']);
  }
  toValDef.push('    ]\n\n');
  const toVal = toValDecl.concat(toValDecons).concat(toValDef);

  // FromVal instance
  var fromVal = [
    'instance C.FromVal ', name, ' where\n',
    '  fromVal = \\case\n',
    '    C.Val\'ApiVal (C.ApiVal\'Struct (C.Struct m)) -> ', name, '\n',
    '      P.<$> C.getMember m "', members[0].label , '"\n'
  ];
  for (var i = 1; i < members.length; i++) {
    fromVal = fromVal.concat([
      '      P.<*> C.getMember m "', members[i].label, '"\n'
    ]);
  }
  fromVal = fromVal.concat([
    '    _ -> Nothing\n',
  ]);

  return decl.concat(toJSON).concat(toVal).concat(fromVal).join('');
};


const genEnumeration = ({name, enumerals}) => {
  // Data type declaration
  const declName = [
    '\n',
    '-- Enumeration: ', name, '\n',
    'data ', name, '\n',
  ];
  function nameTag(i) {
    return name + '\'' + enumerals[i].tag;
  }
  function nameTagMembers(i) {
    return name + '\'' + enumerals[i].tag + '\'Members';
  }
  var declEnumerals = ['  = ', nameTag(0), ' '].concat(enumerals[0].members ? [nameTagMembers(0), '\n'] : ['\n']);
  for (var i = 1; i < enumerals.length; i++) {
    declEnumerals = declEnumerals.concat(
      enumerals[i].members
        ? ['  | ', nameTag(i), ' ', nameTagMembers(i), '\n']
        : ['  | ', nameTag(i), '\n']
    );
  }
  declEnumerals.push(['  deriving (P.Show, P.Eq)\n']);
  const decl = declName.concat(declEnumerals);

  // Data type declarations for members
  var declMemberDecls = [];
  for (var i = 0; i < enumerals.length; i++) {
    const members = enumerals[i].members;
    if (members == undefined) {
      continue;
    }
    // Data type declarations for member
    const declMemberName = [
      '\n',
      'data ', nameTagMembers(i), ' = ', nameTagMembers(i), '\n'
    ];
    var declMembers = ['  { ', members[0].name, ' :: ', members[0].type, '\n'];
    for (var j = 1; j < members.length; j++) {
      declMembers = declMembers.concat(['  , ', members[j].name, ' :: ', members[j].type, '\n']);
    }
    var declDeriving = '  } deriving (P.Show, P.Eq, P.Generic)\n';
    const declMember = declMemberName.concat(declMembers).concat([declDeriving]);
    // ToJSON instance
    const toJSON  = [
      '\n',
      'instance A.ToJSON ', nameTagMembers(i), '\n'
    ];
    declMemberDecls = declMemberDecls.concat(declMember).concat(toJSON);
  }

  // ToJSON instance
  var toJSON  = [
    '\n',
    'instance A.ToJSON ', name, ' where\n',
    '  toJSON = \\case\n',
  ];
  for (var i = 0; i < enumerals.length; i++) {
    var line = [
      '    ', nameTag(i), ' ',
    ];
    const members = enumerals[i].members;
    if (members == undefined) {
      line = line.concat(['-> A.object [ "tag" A..= ("', enumerals[i].tag, '" :: T.Text) ]\n']);
    } else {
      line = line.concat(['m -> C.combineObjects (A.object [ "tag" A..= ("', enumerals[i].label, '" :: T.Text) ]) (A.toJSON m)\n']);
    }
    toJSON = toJSON.concat(line);
  }

  // FromVal instance
  var fromVal = [
    '\n',
    'instance C.FromVal ', name, ' where\n',
    '  fromVal = \\case\n',
    '    C.Val\'ApiVal (C.ApiVal\'Enumerator (C.Enumerator tag m)) -> case (tag,m) of\n',
  ];
  for (var i = 0; i < enumerals.length; i++) {
    const members = enumerals[i].members;
    if (members == undefined) {
      fromVal = fromVal.concat([
        '      ("', enumerals[i].label, '", P.Nothing) -> P.Just ', nameTag(i), '\n',
      ]);
    } else {
      fromVal = fromVal.concat([
        '      ("', enumerals[i].label, '", P.Just m\') -> ', nameTag(i), ' P.<$> (', nameTagMembers(i), '\n',
      ]);
      fromVal = fromVal.concat([
        '          P.<$> C.getMember m\' "', members[0].label, '"\n'
      ]);
      for (var j = 1; j < members.length ; j++) {
        fromVal = fromVal.concat([
          '          P.<*> C.getMember m\' "', members[j].label, '"\n'
        ]);
      }
      fromVal = fromVal.concat([
        '        )\n',
      ]);
    }
  }
  fromVal = fromVal.concat([
    '    _ -> P.Nothing\n',
    '  _ -> P.Nothing\n',
  ]);


  // ToVal instance
  var toVal = [
    '\n',
    'instance C.ToVal ', name, ' where\n',
    '  toVal = \\case\n',
  ];
  for (var i = 0; i < enumerals.length; i++) {
    const members = enumerals[i].members;
    if (members == undefined) {
      toVal = toVal.concat([
        '    ', nameTag(i), ' -> C.Val\'ApiVal P.$ C.ApiVal\'Enumerator $ C.Enumerator "', enumerals[i].label, '" P.Nothing\n',
      ]);
    } else {
      toVal = toVal.concat([
        '    ', nameTag(i), ' ', nameTagMembers(i), '\n',
      ]);
      toVal = toVal.concat([
        '      { ', members[0].name, '\n'
      ]);
      for (var j = 1; j < members.length; j++) {
        toVal = toVal.concat([
          '      , ', members[j].name, '\n'
        ]);
      }
      toVal = toVal.concat([
        '      } -> C.Val\'ApiVal P.$ C.ApiVal\'Enumerator $ C.Enumerator "', enumerals[i].label, '" P.$ Map.fromList\n',
      ]);
      toVal = toVal.concat([
        '      [ ("', members[0].label, '", C.toVal ', members[0].name, ')\n'
      ]);
      for (var j = 1; j < members.length; j++) {
        toVal = toVal.concat([
          '      , ("', members[j].label, '", C.toVal ', members[j].name, ')\n'
        ]);
      }
      toVal = toVal.concat(['      ]\n']);
    }
  }

  return decl.concat(declMemberDecls).concat(toJSON).concat(fromVal).concat(toVal).join('');
};


const genApi = (name, calls) => {
  const apiName = name;
  var lines = [
    '\n',
    '-- API: ', name, '\n',
    'data ', apiName, '\n',
  ];
  lines = lines.concat([
    '  = ', apiName, '\'', calls[0].name,  calls[0].filled ? (' ' + calls[0].name) : '', '\n',
  ]);
  for (var i = 1; i < calls.length; i++) {
    lines = lines.concat([
      '  | ', apiName, '\'', calls[i].name,  calls[i].filled ? (' ' + calls[i].name) : '', '\n',
    ]);

  }
  lines = lines.concat([
    '  deriving (P.Show, P.Eq)\n',
  ]);
  return lines.join('');
};


const genServiceThrower = (error) => {
  return [
    '\n',
    '-- ServiceThrower\n',
    'class Monad m => ServiceThrower m where\n',
    '  serviceThrow :: ', error, ' -> m a\n',
  ].join('');
};


const genService = (calls) => {
  var lines = [
    '\n',
    '-- Service\n',
    'class ServiceThrower m => Service meta m where\n'
  ];
  for (var i = 0; i < calls.length; i++) {
    lines = lines.concat([
      '  ', calls[i].func, ' :: meta ->', calls[i].name ? (' ' + calls[i].name + ' ->') : '', ' m ', calls[i].output, '\n',
    ]);
  }
  return lines.join('');
};


const genVersion = (major,minor) => {
  return [
    '\n',
    '-- Version\n',
    'version :: C.Version\n',
    'version = C.Version ', major, ' ', minor, '\n',
  ].join('');
};

const genApiParser = (name, calls) => {
  var lines = [
    '\n',
    '-- API Parser\n',
    'apiParser :: C.ApiParser ', name, '\n',
    'apiParser = C.ApiParser\n',
  ];

  // Hollow
  if (calls.hollow.length > 0) {
    lines = lines.concat([
      '  { hollow = Map.fromList\n',
    ]);
    lines = lines.concat([
      '     [ ("', calls.hollow[0].label, '", ', name, '\'', calls.hollow[0].name, ')\n',
    ]);
    for (var i = 1; i < calls.hollow.length; i++) {
      lines = lines.concat([
        '     , ("', calls.hollow[i].label, '", ', name, '\'', calls.hollow[i].name, ')\n',
      ]);
    }
    lines = lines.concat([
      '     ]\n',
    ]);
  } else {
    lines = lines.concat([
      '  { hollow = Map.empty\n',
    ]);
  }

  // Struct
  if (calls.struct.length > 0) {
    lines = lines.concat([
      '  , struct = Map.fromList\n',
    ]);
    lines = lines.concat([
      '     [ ("', calls.struct[0].label, '", v ', name, '\'', calls.struct[0].name, ')\n',
    ]);
    for (var i = 1; i < calls.struct.length; i++) {
      lines = lines.concat([
        '     , ("', calls.struct[i].label, '", v ', name, '\'', calls.struct[i].name, ')\n',
      ]);
    }
    lines = lines.concat([
      '     ]\n',
    ]);
  } else {
    lines = lines.concat([
      '  , struct = Map.empty\n',
    ]);
  }

  // Enumeration
  if (calls.enumeration.length > 0) {
    lines = lines.concat([
      '  , enumeration = Map.fromList\n',
    ]);
    lines = lines.concat([
      '     [ ("', calls.enumeration[0].label, '", v ', name, '\'', calls.enumeration[0].name, ')\n',
    ]);
    for (var i = 1; i < calls.enumeration.length; i++) {
      lines = lines.concat([
        '     , ("', calls.enumeration[i].label, '", v ', name, '\'', calls.enumeration[i].name, ')\n',
      ]);
    }
    lines = lines.concat([
      '     ]\n',
    ]);
  } else {
    lines = lines.concat([
      '  , enumeration = Map.empty\n',
    ]);
  }

  // Wrap
  if (calls.wrap.length > 0) {
    lines = lines.concat([
      '  , wrap = Map.fromList\n',
    ]);
    lines = lines.concat([
      '     [ ("', calls.wrap[0].label, '", v ', name, '\'', calls.wrap[0].name, ')\n',
    ]);
    for (var i = 1; i < calls.wrap.length; i++) {
      lines = lines.concat([
        '     , ("', calls.wrap[i].label, '", v ', name, '\'', calls.wrap[i].name, ')\n',
      ]);
    }
    lines = lines.concat([
      '     ]\n',
    ]);
  } else {
    lines = lines.concat([
      '  , wrap = Map.empty\n',
    ]);
  }

  lines = lines.concat([
    '  }\n',
    '  where\n',
    '    v x y = x P.<$> C.fromVal y\n'
  ]);

  return lines.join('');
};

const genApiLookup = (calls) => {
  var lines = [
    '\n',
    '-- API\n',
    'api :: (Service meta m, C.RuntimeThrower m) => meta -> C.ApiCall -> m C.Val\n',
    'api meta\' apiCall\' = case C.parseApiCall apiParser apiCall\' of\n',
    '  P.Nothing -> C.runtimeThrow C.RuntimeError\'UnrecognizedCall\n',
    '  P.Just x\' -> case x\' of\n',
  ];
  for (var i = 0; i < calls.hollow.length; i++) {
    lines = lines.concat([
      '    Api\'', calls.hollow[i].name, ' -> C.toVal P.<$> ', calls.hollow[i].func, ' meta\'\n',
    ]);
  }
  for (var i = 0; i < calls.filled.length; i++) {
    lines = lines.concat([
      '    Api\'', calls.filled[i].name, ' a\' -> C.toVal P.<$> ', calls.filled[i].func, ' meta\' a\'\n',
    ]);
  }
  return lines.join('');
};

const genHandleRequest = (meta) => {
  var lines = [
    '\n',
    '-- Handle Request\n',
    'handleRequest :: (Service meta m, C.RuntimeThrower m, IO.MonadIO m) => C.Options -> (', meta, ' -> m meta) -> C.Request -> m C.Response\n',
    'handleRequest options metaMiddleware C.Request{meta,calls} = do\n',
    '  meta\' <- P.maybe (C.runtimeThrow C.RuntimeError\'UnparsableMeta) P.return (C.fromValFromJson meta)\n',
    '  xformMeta <- metaMiddleware meta\n',
    '  envRef <- IO.liftIO C.emptyEnv\n',
    '  variableBaseCount <- IO.liftIO (Map.size <$> IO.readIORef envRef)\n',
    '  let options\' = C.Options\n',
    '        { variableLimit = P.fmap (P.+ variableBaseCount) (C.variableLimit options)\n',
    '        }\n',
    '  let evalConfig = C.EvalConfig\n',
    '        { C.options = options\'\n',
    '        , C.apiCall = api xformMeta\n',
    '        }\n',
    '  calls\' <- P.maybe (C.runtimeThrow C.RuntimeError\'UnparsableCalls) P.return (P.mapM C.jsonToExpr calls)\n',
    '  vals <- P.mapM (\\v -> C.runEval (C.forceVal P.=<< C.eval v envRef) evalConfig) calls\'\n',
    '  P.return (C.Response\'Success (A.toJSON vals))\n',
  ];
  return lines.join('');
};

const genImports = () => {
  return [
    '\n',
    '-- Imports\n',
    'import qualified Prelude as P\n',
    'import qualified Data.Map as Map\n',
    'import qualifeid Control.Monad.IO.Class as IO\n',
    'import qualified Data.Aeson as A\n',
    'import qualified Data.Text as T\n',
    'import qualified Data.Text.Conversions as T\n',
    'import qualified Data.String as P (IsString)\n',
    'import qualified Data.Word as I\n',
    'import qualified Data.Int as I\n',
    'import qualified Data.IORef as IO\n',
    'import qualified GHC.Generics as P (Generic)\n',
    'import qualified Colorless.Types as C\n',
    'import qualified Colorless.Runtime.Expr as C\n',
    'import qualified Colorless.Runtime.Val as C (ToVal(..), FromVal(..), getMember, fromValFromJson, combineObjects)\n',
  ].join('');
};

const genExtensions = () => {
  return [
    '-- Extensions\n',
    '{-# LANGUAGE DeriveGeneric #-}\n',
    '{-# LANGUAGE DuplicateRecordFields #-}\n',
    '{-# LANGUAGE LambdaCase #-}\n',
    '{-# LANGUAGE OverloadedStrings #-}\n',
    '{-# LANGUAGE GeneralizedNewtypeDeriving #-}\n',
    '{-# LANGUAGE MultiParamTypeClasses #-}\n',
    '{-# LANGUAGE NamedFieldPuns #-}\n',
    '{-# LANGUAGE TupleSections #-}\n',
    '{-# LANGUAGE FlexibleContexts #-}\n',
    '{-# LANGUAGE FlexibleInstances #-}\n',
    '{-# LANGUAGE ScopedTypeVariables #-}\n',
    '{-# LANGUAGE NoImplicitPrelude #-}\n',
  ].join('');
};

const genModule = (prefix, version, types) => {
  var lines = [
    '\n',
    '-- Module\n',
    'module ', prefix, '.V', version.major, '_', version.minor, '\n',
    '  ( version\n',
    '  , handleRequest\n',
    '  , ServiceThrower(..)\n',
    '  , Service(..)\n',
    '  , Api(..)\n',
  ];
  for (var i = 0; i < types.length; i++) {
    lines = lines.concat([
      '  , ', types[i], '(..)\n',
    ]);
  }
  lines = lines.concat([
    '  ) where\n',
  ]);
  return lines.join('');
};

const mkExportTypes = (s) => {
  return []
    .concat(s.hollow)
    .concat(s.struct)
    .concat(s.enumeration)
    .concat(s.wrap)
    .map(x => x.name);
};

const mkServiceCalls = (s) => {
  return []
    .concat(s.hollow
      .map(x => {
        var copy = Object.assign({}, x);
        delete copy.name;
        return copy;
      }))
    .concat(s.struct)
    .concat(s.enumeration)
    .concat(s.wrap)
    .filter(x => x.output && x.func);
};

const mkApiLookupPairs = (s) => {
  return {
    hollow: s.hollow.filter(x => x.func && x.output),
    filled: [].concat(s.wrap).concat(s.struct).concat(s.enumeration).filter(x => x.func && x.output),
  };
};

const mkApiCalls = (s) => {
  const filled = ({name}) => ({name, filled: true});
  const notFilled = ({name}) => ({name, filled: false});
  return []
    .concat(s.hollow.map(notFilled))
    .concat(s.struct.map(filled))
    .concat(s.enumeration.map(filled))
    .concat(s.wrap.map(filled));
};

const mkApiParserCalls = (s) => {
  const isFunc = x => x.func && x.output;
  return {
    hollow: s.hollow.filter(isFunc),
    wrap: s.wrap.filter(isFunc),
    struct: s.struct.filter(isFunc),
    enumeration: s.enumeration.filter(isFunc),
  };
};

export const gen = (s) => {
  const exportTypes = mkExportTypes(s);
  const serviceCalls = mkServiceCalls(s);
  const apiLookupPairs = mkApiLookupPairs(s);
  const apiCalls = mkApiCalls(s);
  const apiParserCalls = mkApiParserCalls(s);
  return [
    genExtensions(),
    genModule(s.module, s.version, exportTypes),
    genImports(),
    genVersion(s.version.major, s.version.minor),
    genServiceThrower(s.error),
    genService(serviceCalls),
    genHandleRequest(s.meta),
    genApiLookup(apiLookupPairs),
    genApiParser(s.name, apiParserCalls),
    genApi(s.name, apiCalls),
  ]
    .concat(s.wrap.map(genWrap))
    .concat(s.struct.map(genStruct))
    .concat(s.enumeration.map(genEnumeration))
    .join('');
};