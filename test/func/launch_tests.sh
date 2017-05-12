#!/usr/bin/env bash

number=0
pids=""
IFS=: read -r -d '' -a path_array < <(printf '%s:\0' "$CHR_BIN_TMP")

echo "XUNITFILE: $XUNIT_PREFIX"
for p in "${path_array[@]}"; do
	echo "0x$((1<<(number%4)))"
	DISPLAY=$DISPLAY XUNIT_FILE="$XUNIT_PREFIX.$number.$XUNIT_POSTFIX" MOCK_HTTP_PORT=$((number+7654)) CHROME_BINARIES=$p FIREFOX_BINARIES= taskset 0x$((1<<(number%4))) $MOCHA_PARAMS mocha_test.js
	#pids+=" $!"
	((number++))
done

IFS=: read -r -d '' -a path_array < <(printf '%s:\0' "$FF_BIN_TMP")
for p in "${path_array[@]}"; do
	echo "0x$((1<<(number%4)))"
	DISPLAY=$DISPLAY XUNIT_FILE="$XUNIT_PREFIX.$number.$XUNIT_POSTFIX" MOCK_HTTP_PORT=$((number+7654)) CHROME_BINARIES= FIREFOX_BINARIES=$p taskset 0x$((1<<(number%4))) $MOCHA_PARAMS mocha_test.js
	#pids+=" $!"
	((number++))
done


#for p in $pids; do
#	echo "Waiting for $p to finish..."
#	if wait $p; then
#		echo "Process $p success"
#	else
#		echo "Process $p fail"
#	fi
#done
