"use strict";

import * as React from 'react';
/**
 * Render content lazily based on visibility.
 *
 * When lazy is enabled:
 * - If content is visible, it will render immediately
 * - If content is not visible, it won't render until it becomes visible
 *
 * Otherwise:
 * - If content is visible, it will render immediately
 * - If content is not visible, it will defer rendering
 *
 * Once rendered, the content remains rendered.
 */
export function Deferred({
  lazy,
  visible,
  children
}) {
  const [rendered, setRendered] = React.useState(lazy ? visible : false);
  const shouldRenderDeferred = !(lazy || visible || rendered);
  React.useEffect(() => {
    if (shouldRenderDeferred === false) {
      return;
    }
    React.startTransition(() => {
      setRendered(true);
    });
  }, [shouldRenderDeferred]);
  if (visible && rendered === false) {
    setRendered(true);
    return children;
  }
  if (rendered) {
    return children;
  }
  return null;
}
//# sourceMappingURL=Deferred.js.map