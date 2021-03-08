---
id: emeManager-architecture
title: EMEManager
sidebar_label: EMEManager
slug: architecture/eme-manager
---

# The EMEManager

## Overview

The `EMEManager` in the `core/eme` directory allows to easily interface with
the browser APIs for decrypting a crypted content, it follows the [Encrypted
Media Extensions recommandations](https://www.w3.org/TR/encrypted-media/).

Like most modules in the RxPlayer, the EMEManager is just a function - called
a single time - returning an Observable.

This Observable then return event corresponding to different milestones related
to decrypting the content.
