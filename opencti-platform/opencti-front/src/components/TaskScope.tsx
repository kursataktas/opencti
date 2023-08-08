import React, { FunctionComponent } from 'react';
import Chip from '@mui/material/Chip';
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles(() => ({
  chip: {
    fontSize: 12,
    lineHeight: '12px',
    height: 25,
    marginRight: 7,
    textTransform: 'uppercase',
    borderRadius: '0',
    width: 130,
  },
}));

const inlineStyles = {
  blue: {
    backgroundColor: 'rgba(92, 123, 245, 0.08)',
    color: '#5c7bf5',
  },
  grey: {
    backgroundColor: 'rgba(96, 125, 139, 0.08)',
    color: '#607d8b',
  },
  orange: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    color: '#ff9800',
  },
};

interface TaskScopeProps {
  label: string,
  scope: string,
}

const TaskScope: FunctionComponent<TaskScopeProps> = ({ label, scope }) => {
  const classes = useStyles();
  const style = classes.chip;
  switch (scope) {
    case 'USER':
      return (
        <Chip
          classes={{ root: style }}
          style={inlineStyles.orange}
          label={label}
        />
      );
    case 'KNOWLEDGE':
      return (
        <Chip
          classes={{ root: style }}
          style={inlineStyles.blue}
          label={label}
        />
      );
    default:
      return (
        <Chip
          classes={{ root: style }}
          style={inlineStyles.grey}
          label={label}
        />
      );
  }
};

export default TaskScope;
