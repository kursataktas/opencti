import type { Resolvers } from '../../generated/graphql';
import { findById, findAll, addExclusionListWithValues, addExclusionListWithFile, deleteExclusionList } from './exclusionList-domain';

const exclusionListResolver: Resolvers = {
  Query: {
    exclusionList: (_, { id }, context) => findById(context, context.user, id),
    exclusionLists: (_, args, context) => findAll(context, context.user, args),
  },
  Mutation: {
    exclusionListAddWithValues: (_, { input }, context) => {
      return addExclusionListWithValues(context, context.user, input);
    },
    exclusionListAddFWithFile: (_, { input }, context) => {
      return addExclusionListWithFile(context, context.user, input);
    },
    exclusionListDelete: (_, { id }, context) => {
      return deleteExclusionList(context, context.user, id);
    },
  },
};

export default exclusionListResolver;
