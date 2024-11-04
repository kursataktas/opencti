import type { Resolvers } from '../../generated/graphql';
import { findById, findAll, addExclusionListValues, addExclusionListFile, deleteExclusionList } from './exclusionList-domain';

const exclusionListResolver: Resolvers = {
  Query: {
    exclusionList: (_, { id }, context) => findById(context, context.user, id),
    exclusionLists: (_, args, context) => findAll(context, context.user, args),
  },
  Mutation: {
    exclusionListValuesAdd: (_, { input }, context) => addExclusionListValues(context, context.user, input),
    exclusionListFileAdd: (_, { input }, context) => addExclusionListFile(context, context.user, input),
    exclusionListDelete: (_, { id }, context) => deleteExclusionList(context, context.user, id),
  },
};

export default exclusionListResolver;
