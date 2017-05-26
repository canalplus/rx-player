    > - [timeFragment](#prop-timeFragment)

> ### <a name="prop-timeFragment"></a>timeFragment

> _type_: ``Object|undefined``

> The ``timeFragment`` option allows to specify a start and/or end time in the current content.

> This has many effects:
>   - The start time will be the position at which the playback will begin
>   - The end time will be the position at which the playback will end
>   - The start time set will be returned by the ``getStartTime`` API. If not set, ``0`` will be returned instead.
>   - The end time set will be returned by the ``getEndTime`` API. If not set, ``Infinity`` will be returned instead.
>   - The start time has an effect to where the ``goToStart`` API could seek (the start time if superior to the size of the server-side buffer for live contents).

> To specify time fragments, you can set one or both of those properties:
>   - ``start`` (``string|Number``):
>   - ``end`` (``string|Number``):

> Both of those can take either one of the following forms:
>   - If a string is given, it should be a percentage (from ``"0%"`` to ``"100%"``). Which is the percentage where to start/end relatively to the content duration.
>   - If a Number is given it should either be:
>     - if the content is live, a timestamp in milliseconds corresponding to the wallClockTime wanted
>     - if the content is not live, the position in seconds

> This is actually a simplification of the API (!), it will be refactored on release 3.0.0.
