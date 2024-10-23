import useBuildListOutcome from './stix_core_objects/useBuildListOutcome';
import useDonutOutcome from './stix_relationships/useDonutOutcome';
import { fetchQuery } from '../../../relay/environment';
import { templateAndUtilsContainerQuery } from './TemplateAndUtils';
import { TemplateAndUtilsContainerQuery$data } from './__generated__/TemplateAndUtilsContainerQuery.graphql';
import buildAttributesOutcome from './stix_core_objects/buildAttributesOutcome';

const useContentFromTemplate = () => {
  const { buildDonutOutcome } = useDonutOutcome();
  const { buildListOutcome } = useBuildListOutcome();

  const buildContentFromTemplate = async (
    containerId: string,
    templateId: string,
    maxContentMarkings: string[],
  ) => {
    const variables = { id: containerId, templateId };
    const { container } = await fetchQuery(templateAndUtilsContainerQuery, variables).toPromise() as TemplateAndUtilsContainerQuery$data;

    if (!container || !container.templateAndUtils) {
      throw Error('No template found');
    }

    const { template, template_widgets } = container.templateAndUtils;
    let { content } = template;
    const templateWidgets = template_widgets.map((tw) => ({ ...tw, widget: JSON.parse(tw.widget) }));

    // attribute widgets
    const attributeWidgets = templateWidgets
      .filter((tw) => tw.widget.type === 'attribute');
    if (attributeWidgets.length > 0) {
      const attributeWidgetsOutcome = await buildAttributesOutcome(containerId, attributeWidgets);
      attributeWidgetsOutcome.forEach((attributeOutcome) => {
        content = content.replace(`$${attributeOutcome.variableName}`, attributeOutcome.attributeData);
      });
    }

    // other widgets
    for (const templateWidget of templateWidgets) {
      let outcome = '';
      const { widget } = templateWidget;
      if (widget.type === 'list') {
        // eslint-disable-next-line no-await-in-loop
        outcome = await buildListOutcome(containerId, widget, maxContentMarkings);
      } else if (widget.type === 'donut') {
        // eslint-disable-next-line no-await-in-loop
        outcome = await buildDonutOutcome(containerId, widget, maxContentMarkings);
      }
      content = content.replace(`$${templateWidget.name}`, outcome);
    }

    return content;
  };

  return { buildContentFromTemplate };
};

export default useContentFromTemplate;
